"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.provider = void 0;
const stringio_1 = require("@rauschma/stringio");
const child_process_1 = require("child_process");
const _1 = require(".");
const utils_1 = require("../utils");
const fs = require("fs");
const path = require("path");
const { v4: uuid } = require("uuid");
const tmp = require("tmp");
class PubLink {
}
let CommandStatus;
class GftpDriver {
    async version() {
        return await this._jsonrpc("version");
    }
    async publish(files) {
        return await this._jsonrpc("publish", { files });
    }
    async receive(output_file) {
        return await this._jsonrpc("receive", { output_file });
    }
    async shutdown() {
        await stringio_1.streamEnd(this._proc.stdin);
    }
    async _jsonrpc(method, params = {}) {
        if (!this._reader) {
            this._reader = this._readStream(this._proc.stdout);
        }
        let query = `{"jsonrpc": "2.0", "id": "1", "method": "${method}", "params": ${JSON.stringify(params)}}\n`;
        await stringio_1.streamWrite(this._proc.stdin, query);
        try {
            let { value } = await this._reader.next();
            const { result } = JSON.parse(value);
            return result;
        }
        catch (error) {
            utils_1.logger.error(error);
            throw Error(error);
        }
    }
    async *_readStream(readable) {
        for await (const line of stringio_1.chunksToLinesAsync(readable)) {
            yield stringio_1.chomp(line);
        }
    }
}
function service(debug = false) {
    return new _Process(debug);
}
class _Process {
    constructor(_debug = false) {
        this._debug = _debug;
        this._proc = null;
    }
    async ready() {
        let env = this._debug
            ? { ...process.env, RUST_LOG: "debug" }
            : { ...process.env };
        this._proc = await child_process_1.spawn("gftp server", [], {
            shell: true,
            env: env,
        });
        let gftp = new GftpDriver();
        gftp["_proc"] = this._proc;
        return gftp;
    }
    async done() {
        await this._close();
    }
    async _close() {
        if (!this._proc)
            return;
        let p = this._proc;
        this._proc = null;
        if (p.stdin) {
            p.stdin.destroy();
        }
        p.kill();
        let ret_code = await p.signalCode;
        utils_1.logger.debug(`GFTP server closed, code=${ret_code}`);
    }
    _log_debug(msg_dir, msg) {
        if (this._debug) {
            if (msg instanceof Buffer)
                msg = msg.toString("utf-8");
            let stderr = process.stderr;
            stderr.write(msg_dir == "in" ? "\n <= " : "\n => ");
            stderr.write(msg);
        }
    }
    async send_message(message) {
        if (!this._proc)
            return;
        if (!this._proc.stdin)
            return;
        if (!this._proc.stdout)
            return;
        let _message = message.serialize() + "\n";
        let buffer = Buffer.from(_message, "utf-8");
        this._log_debug("out", _message);
        this._proc.stdin.write(buffer);
        await this._proc.stdin.drain();
        let msg = await this._proc.stdout.readline();
        this._log_debug("in", msg);
        msg = JSON.parse(msg);
        return message.parse_response(msg);
    }
}
function _temp_file(temp_dir) {
    let file_name = path.join(temp_dir, uuid().toString());
    if (fs.existsSync(file_name))
        fs.unlinkSync(file_name);
    return file_name;
}
class GftpSource extends _1.Source {
    constructor(length, link) {
        super();
        this._len = length;
        this._link = link;
    }
    download_url() {
        return this._link["url"];
    }
    async content_length() {
        return this._len;
    }
}
class GftpDestination extends _1.Destination {
    constructor(_proc, _link) {
        super();
        this._proc = _proc;
        this._link = _link;
    }
    upload_url() {
        return this._link["url"];
    }
    async download_stream() {
        let file_path = this._link["file"];
        let length = fs.statSync(file_path)["size"];
        async function* chunks() {
            const stream = fs.createReadStream(file_path, {
                highWaterMark: 30000,
                encoding: "binary",
            });
            stream.once("end", () => {
                stream.destroy();
            });
            for await (let chunk of stream)
                yield chunk;
        }
        return new _1.Content(length, chunks());
    }
    async download_file(destination_file) {
        if (destination_file.toString() == this._link["file"])
            return;
        return await super.download_file(destination_file);
    }
}
class GftpProvider extends _1.StorageProvider {
    constructor(tmpdir = null) {
        super();
        this.__exit_stack = new utils_1.AsyncExitStack();
        this._temp_dir = tmpdir || null;
        this._process = null;
    }
    async ready() {
        this._temp_dir = tmp.dirSync().name;
        let _process = await this.__get_process();
        let _ver = await _process.version();
        utils_1.logger.info(`GFTP Version:${_ver}`);
        if (!_ver)
            throw Error("GFTP couldn't found.");
        return this;
    }
    async done() {
        await this.__exit_stack.aclose();
        return null;
    }
    __new_file() {
        let temp_dir = this._temp_dir || tmp.dirSync().name;
        if (!this._temp_dir)
            this._temp_dir = temp_dir;
        const temp_file = _temp_file(temp_dir);
        return temp_file;
    }
    async __get_process() {
        let _debug = !!process.env["DEBUG_GFTP"];
        let _process = this._process ||
            (await this.__exit_stack.enter_async_context(service(_debug)));
        if (!this._process)
            this._process = _process;
        return _process;
    }
    async upload_stream(length, stream) {
        let file_name = this.__new_file();
        let wStream = fs.createWriteStream(file_name, {
            encoding: "binary",
        });
        await new Promise(async (fulfill) => {
            wStream.once("finish", fulfill);
            for await (let chunk of stream) {
                wStream.write(chunk);
            }
            wStream.end();
        });
        let _process = await this.__get_process();
        let links = await _process.publish([file_name.toString()]);
        if (links.length !== 1)
            throw "invalid gftp publish response";
        let link = links[0];
        return new GftpSource(length, link);
    }
    async upload_file(_path) {
        let _process = await this.__get_process();
        let links = await _process.publish([_path.toString()]);
        let length = fs.statSync(_path)["size"];
        if (links.length !== 1)
            throw "invalid gftp publish response";
        return new GftpSource(length, links[0]);
    }
    async new_destination(destination_file = null) {
        if (destination_file) {
            if (fs.existsSync(destination_file)) {
                destination_file = null;
            }
        }
        let output_file = destination_file
            ? destination_file.toString()
            : this.__new_file();
        let _process = await this.__get_process();
        let link = await _process.receive(output_file);
        return new GftpDestination(_process, link);
    }
}
function provider() {
    return new GftpProvider();
}
exports.provider = provider;
//# sourceMappingURL=gftp.js.map
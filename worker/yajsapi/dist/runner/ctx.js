"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkContext = exports.Work = exports.CommandContainer = void 0;
const events = __importStar(require("./events"));
const storage_1 = require("../storage");
const utils_1 = require("../utils");
class CommandContainer {
    constructor() {
        this._commands = [];
        return new Proxy(this, this.getattr());
    }
    commands() {
        return this._commands;
    }
    getattr() {
        const self = this;
        return {
            get(target, name) {
                if (target[name] !== undefined) {
                    return target[name];
                }
                const newFunction = function () {
                    let _arguments = {};
                    let args = arguments[0] || {};
                    for (const [key, value] of Object.entries(args)) {
                        _arguments = {
                            ..._arguments,
                            [key.startsWith("_") ? key.slice(1) : key]: value,
                        };
                    }
                    let idx = self._commands.length;
                    self._commands.push({ [name]: _arguments });
                    return idx;
                };
                return new Proxy(newFunction, {
                    apply: function (target, thisArg, argumentsList) {
                        return target.apply(thisArg, argumentsList);
                    },
                });
            },
        };
    }
}
exports.CommandContainer = CommandContainer;
class Work {
    constructor() {
        this.output = [];
    }
    async prepare() {
    }
    register(commands) { }
    async post() { }
}
exports.Work = Work;
class _InitStep extends Work {
    register(commands) {
        commands.deploy();
        commands.start();
    }
}
class _SendWork extends Work {
    constructor(storage, dst_path) {
        super();
        this._storage = storage;
        this._dst_path = dst_path;
        this._src = null;
        this._idx = null;
    }
    async do_upload(storage) {
        return new Promise((resolve) => resolve(new storage_1.Source()));
    }
    async prepare() {
        this._src = await this.do_upload(this._storage);
    }
    register(commands) {
        if (!this._src)
            throw "cmd prepared";
        this._idx = commands.transfer({
            _from: this._src.download_url(),
            _to: `container:${this._dst_path}`,
            _args: {},
        });
    }
}
class _SendJson extends _SendWork {
    constructor(storage, data, dst_path) {
        super(storage, dst_path);
        this._cnt = 0;
        this._data = Buffer.from(JSON.stringify(data), "utf-8");
    }
    async do_upload(storage) {
        this._cnt += 1;
        if (!this._data)
            throw `json buffer unintialized ${this._cnt}`;
        let src = await storage.upload_bytes(this._data);
        this._data = null;
        return src;
    }
}
class _SendFile extends _SendWork {
    constructor(storage, src_path, dst_path) {
        super(storage, dst_path);
        this._src_path = src_path;
    }
    async do_upload(storage) {
        return await storage.upload_file(this._src_path);
    }
}
class _Run extends Work {
    constructor(cmd, args = [], env = null) {
        super();
        this.cmd = cmd;
        this.args = args;
        this.env = env;
        this._idx = null;
    }
    register(commands) {
        this._idx = commands.run({
            entry_point: this.cmd,
            args: this.args || [],
            capture: {
                stdout: { atEnd: {} },
                stderr: { atEnd: {} },
            }
        });
    }
}
class _Sign extends Work {
    constructor() {
        super();
        this._idx = null;
    }
    register(commands) {
        this._idx = commands.sign({});
    }
}
const StorageEvent = events.DownloadStarted || events.DownloadFinished;
class _RecvFile extends Work {
    constructor(storage, src_path, dst_path, emitter = null) {
        super();
        this._emitter = null;
        this._storage = storage;
        this._dst_path = dst_path;
        this._src_path = src_path;
        this._dst_slot = null;
        this._idx = null;
        this._emitter = emitter;
    }
    async prepare() {
        this._dst_slot = await this._storage.new_destination(this._dst_path);
    }
    register(commands) {
        if (!this._dst_slot)
            throw "_RecvFile command creation without prepare";
        this._idx = commands.transfer({
            _from: `container:${this._src_path}`,
            _to: this._dst_slot.upload_url(),
        });
    }
    async post() {
        if (!this._dst_slot)
            throw "_RecvFile post without prepare";
        if (this._emitter)
            this._emitter(new events.DownloadStarted({ path: this._src_path }));
        await this._dst_slot.download_file(this._dst_path);
        if (this._emitter)
            this._emitter(new events.DownloadFinished({ path: this._dst_path }));
    }
}
class _Steps extends Work {
    constructor(steps) {
        super();
        this._steps = [];
        if (steps instanceof Work)
            this._steps.push(steps);
        else
            steps.forEach((step) => this._steps.push(step));
    }
    async prepare() {
        for (let step of this._steps) {
            await step.prepare();
        }
    }
    register(commands) {
        for (let step of this._steps) {
            step.register(commands);
        }
    }
    async post() {
        for (let step of this._steps) {
            await step.post();
        }
    }
}
class WorkContext {
    constructor(ctx_id, storage, emitter = null) {
        this._id = ctx_id;
        this._storage = storage;
        this._pending_steps = [];
        this._started = false;
        this._emitter = emitter;
    }
    _prepare() {
        if (!this._started) {
            this._pending_steps.push(new _InitStep());
            this._started = true;
        }
    }
    begin() { }
    send_json(json_path, data) {
        this._prepare();
        this._pending_steps.push(new _SendJson(this._storage, data, json_path));
    }
    send_file(src_path, dst_path) {
        this._prepare();
        this._pending_steps.push(new _SendFile(this._storage, src_path, dst_path));
    }
    run(cmd, args, env = null) {
        this._prepare();
        this._pending_steps.push(new _Run(cmd, args, env));
    }
    download_file(src_path, dst_path) {
        this._prepare();
        this._pending_steps.push(new _RecvFile(this._storage, src_path, dst_path, this._emitter));
    }
    sign() {
        this._prepare();
        this._pending_steps.push(new _Sign());
    }
    log(args) {
        utils_1.logger.info(`${this._id}: ${args}`);
    }
    commit() {
        let steps = this._pending_steps;
        this._pending_steps = [];
        return new _Steps(steps);
    }
}
exports.WorkContext = WorkContext;
//# sourceMappingURL=ctx.js.map
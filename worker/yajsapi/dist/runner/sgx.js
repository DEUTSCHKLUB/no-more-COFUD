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
exports.repo = exports.SgxEngine = exports.SGX_CONFIG = void 0;
const fs = __importStar(require("fs"));
const base_1 = require("../props/base");
const common_1 = require("./common");
const inf_1 = require("../props/inf");
const sgx_ias_js_1 = require("sgx-ias-js");
class _InfSgx extends inf_1.InfBase {
    constructor(runtime) {
        super();
        this.runtime = new base_1.Field({
            value: runtime,
            metadata: { key: inf_1.INF_RUNTIME },
        });
        this.cores = new base_1.Field({ value: 1, metadata: { key: inf_1.INF_CORES } });
    }
}
class _SgxConstrains extends common_1.Constraints {
    constructor(runtime, min_mem_gib, min_storage_gib) {
        super();
        const fields = inf_1.InfBase.fields(new _InfSgx(runtime), ["cores", "mem", "storage", "runtime"]);
        super.extend([
            `(${fields["cores"]}>=1)`,
            `(${fields["mem"]}>=${min_mem_gib})`,
            `(${fields["storage"]}>=${min_storage_gib})`,
            `(${fields["runtime"]}=${runtime})`,
        ]);
    }
}
const DEFAULT_SGX_CONFIG = {
    "enableAttestation": true,
    "exeunitHashes": ["5edbb025714683961d4a2cb51b1d0a4ee8225a6ced167f29eb67f639313d9490"],
    "allowDebug": true,
    "allowOutdatedTcb": true,
    "maxEvidenceAge": 60
};
class SgxConfig {
    static from_env() {
        let env_path = process.env.YAGNA_SGX_CONFIG;
        let json = env_path
            ? fs.readFileSync(env_path)
            : DEFAULT_SGX_CONFIG;
        json["exeunitHashes"].forEach((hex, i) => {
            json["exeunitHashes"][i] = sgx_ias_js_1.types.bytes.Bytes32.from(sgx_ias_js_1.types.parseHex(hex));
        });
        let sgx_config = Object.create(this.prototype);
        return Object.assign(sgx_config, json);
    }
}
exports.SGX_CONFIG = SgxConfig.from_env();
var SgxEngine;
(function (SgxEngine) {
    SgxEngine["GRAPHENE"] = "sgx";
    SgxEngine["JS"] = "sgx-js";
    SgxEngine["WASM"] = "sgx-wasm";
    SgxEngine["WASI"] = "sgx-wasi";
})(SgxEngine = exports.SgxEngine || (exports.SgxEngine = {}));
async function repo(engine, image_hash, min_mem_gib = 0.5, min_storage_gib = 2.0, image_repo = common_1.DEFAULT_REPO_URL) {
    let pkg_url = await common_1.resolve_url(image_repo, image_hash);
    let secure = true;
    let runtime;
    switch (engine) {
        case SgxEngine.GRAPHENE:
            runtime = inf_1.RuntimeType.SGX;
            break;
        case SgxEngine.JS:
            runtime = inf_1.RuntimeType.SGX_JS;
            break;
        case SgxEngine.WASM:
            runtime = inf_1.RuntimeType.SGX_WASM;
            break;
        case SgxEngine.WASI:
            runtime = inf_1.RuntimeType.SGX_WASI;
            break;
        default:
            throw Error(`Invalid SGX runtime: ${engine}`);
    }
    return new common_1.DemandDecor(new _SgxConstrains(runtime, min_mem_gib, min_storage_gib), new inf_1.ExeUnitRequest(pkg_url), secure);
}
exports.repo = repo;
//# sourceMappingURL=sgx.js.map
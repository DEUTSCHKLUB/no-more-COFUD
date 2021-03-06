"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DemandBuilder = void 0;
const dayjs_1 = __importDefault(require("dayjs"));
class DemandBuilder {
    constructor() {
        this._props = {};
        this._constraints = [];
    }
    props() {
        return this._props;
    }
    cons() {
        let c_list = this._constraints;
        let c_value;
        if (!c_list || c_list.length < 1)
            c_value = "()";
        else if (Object.keys(c_list).length == 1)
            c_value = c_list[0];
        else {
            let rules = c_list.join("\n\t");
            c_value = `(&${rules})`;
        }
        return c_value;
    }
    ensure(constraint) {
        this._constraints.push(constraint);
    }
    add(m) {
        let kv = m.keys();
        for (let name of kv.names()) {
            let prop_id = kv.get()[name];
            let value = m[name].value;
            if (value == null)
                continue;
            if (dayjs_1.default.isDayjs(value))
                value = value.valueOf();
            else if (value instanceof Object) {
                value = value.value;
                if (!(value instanceof String ||
                    value instanceof Number ||
                    value instanceof Array))
                    throw Error("");
            }
            this._props[prop_id] = value;
        }
    }
    async subscribe(market) {
        let result = await market.subscribe(this.props(), this.cons());
        return result;
    }
}
exports.DemandBuilder = DemandBuilder;
//# sourceMappingURL=builder.js.map
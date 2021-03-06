"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Model = exports.Field = exports.as_list = void 0;
const dayjs_1 = __importDefault(require("dayjs"));
const utils_1 = require("../utils");
function as_list(data) {
    if (!(typeof data == "string"))
        return data;
    let item = JSON.parse(data);
    if (typeof item == "object")
        return item;
    return [JSON.stringify(item)];
}
exports.as_list = as_list;
function _find_enum(enum_type, val) {
    for (let member of Object.entries(enum_type)) {
        if (member[1] == val)
            return member;
    }
    return null;
}
class Field {
    constructor({ value, metadata, name, } = {}) {
        this._value = value || null;
        this._metadata = metadata || {};
        this._name = name || null;
        this._type = typeof value;
    }
    set value(x) {
        if (this._type === "undefined" || this._type === "null") {
            this._type = typeof x;
        }
        else if (this._type !== typeof this._value) {
            throw Error("wrong type");
        }
        this._value = x;
    }
    get value() {
        return this._value;
    }
    get metadata() {
        return this._metadata;
    }
    set name(x) {
        this._name = x;
    }
    get name() {
        return this._name;
    }
    get type() {
        return this._type;
    }
    valueOf() {
        return this._value;
    }
}
exports.Field = Field;
class _PyField {
    constructor(name, type, required) {
        this.name = name;
        this.type = type;
        this.required = required;
    }
    encode(value) {
        if (this.type === Date)
            return [
                this.name,
                dayjs_1.default.unix(parseInt((parseFloat(value) * 0.001).toString())).toDate(),
            ];
        return [this.name, value];
    }
}
class InvalidPropertiesError extends Error {
    constructor(key, description) {
        super(description);
        this.name = key;
    }
}
class Model {
    constructor() { }
    _custom_mapping(props, data) { }
    fields(cls) {
        let fields = [];
        let props = utils_1.getAllProperties(cls);
        for (let prop of props) {
            if (cls[prop] instanceof Field) {
                cls[prop].name = prop;
                fields.push(cls[prop]);
            }
        }
        return fields;
    }
    from_props(props) {
        let field_map = {};
        let data = {};
        for (let f of this.fields(this)) {
            if ("key" in f.metadata) {
                field_map[f.metadata["key"]] = new _PyField(f.name, f.type, !!f.value);
            }
        }
        for (const [key, val] of Object.entries(props)) {
            if (key in field_map) {
                let [_key, _val] = field_map[key].encode(val);
                data[_key] = _val;
            }
        }
        this._custom_mapping(props, data);
        let self = new (Object.getPrototypeOf(this).constructor)();
        for (let [key, value] of Object.entries(data)) {
            if (self[key] instanceof Field) {
                self[key].value = value;
            }
            else {
                self[key] = value;
            }
        }
        return self;
    }
    keys() {
        class _Keys {
            constructor(iter) {
                for (let [key, value] of Object.entries(iter)) {
                    this[key] = value;
                }
            }
            names() {
                return Object.keys(this);
            }
            get() {
                return this;
            }
        }
        let keyList = {};
        for (let [key, value] of Object.entries(this)) {
            keyList[key] = value.metadata["key"];
        }
        return new _Keys(keyList);
    }
}
exports.Model = Model;
//# sourceMappingURL=base.js.map
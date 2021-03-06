"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityKeys = exports.Activity = exports.IdentificationKeys = exports.Identification = exports.Model = exports.DemandBuilder = void 0;
const base_1 = require("./base");
Object.defineProperty(exports, "Model", { enumerable: true, get: function () { return base_1.Model; } });
const builder_1 = require("./builder");
Object.defineProperty(exports, "DemandBuilder", { enumerable: true, get: function () { return builder_1.DemandBuilder; } });
class Identification extends base_1.Model {
    constructor(subnet_tag = "testnet", name) {
        super();
        this.name = new base_1.Field({ metadata: { key: "golem.node.id.name" } });
        this.subnet_tag = new base_1.Field({
            metadata: { key: "golem.node.debug.subnet" },
        });
        this.subnet_tag.value = subnet_tag;
        if (name) {
            this.name.value = name;
        }
    }
}
exports.Identification = Identification;
exports.IdentificationKeys = new Identification().keys().get();
class Activity extends base_1.Model {
    constructor() {
        super(...arguments);
        this.cost_cap = new base_1.Field({ metadata: { key: "golem.activity.cost_cap" } });
        this.cost_warning = new base_1.Field({
            metadata: { key: "golem.activity.cost_warning" },
        });
        this.timeout_secs = new base_1.Field({
            metadata: { key: "golem.activity.timeout_secs" },
        });
        this.expiration = new base_1.Field({
            metadata: { key: "golem.srv.comp.expiration" },
        });
    }
}
exports.Activity = Activity;
exports.ActivityKeys = new Activity().keys().get();
//# sourceMappingURL=index.js.map
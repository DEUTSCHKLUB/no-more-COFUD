"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _1 = require("./");
async function asyncWith(expression, block) {
    let mgr = expression ? await expression.ready.call(expression) : null;
    try {
        await block(mgr);
    }
    catch (error) {
        const { message, stack } = error;
        console.log();
        _1.logger.error(`${message}\n\n${stack}\n`);
    }
    await expression.done.call(expression, mgr);
}
exports.default = asyncWith;
//# sourceMappingURL=asyncWith.js.map
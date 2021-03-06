"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _1 = require(".");
class AsyncWrapper {
    constructor(wrapped, event_loop = null, cancellationToken) {
        this._wrapped = wrapped;
        this._args_buffer = new _1.Queue([], cancellationToken);
        this._task = null;
        this._loop = event_loop || _1.eventLoop();
        this._cancellationToken = cancellationToken;
    }
    async _worker() {
        while (true) {
            if (this._cancellationToken.cancelled)
                break;
            const args = await this._args_buffer.get();
            this._wrapped(...args);
        }
    }
    async ready() {
        this._task = this._loop
            .create_task(this._worker.bind(this))
            .catch(() => { });
    }
    async done() {
        if (this._task)
            this._task.cancel();
        this._task = null;
    }
    async_call() {
        this._args_buffer.put([...arguments]);
    }
}
exports.default = AsyncWrapper;
//# sourceMappingURL=asyncWrapper.js.map
import { StorageProvider } from "../storage";
import { Callable } from "../utils";
export declare class CommandContainer {
    private _commands;
    constructor();
    commands(): any;
    getattr(): {
        get(target: any, name: any): any;
    };
}
export declare class Work {
    output: object[];
    attestation?: object;
    prepare(): Promise<void>;
    register(commands: CommandContainer): void;
    post(): Promise<void>;
}
export declare class WorkContext {
    private _id;
    private _storage;
    private _pending_steps;
    private _started;
    private _emitter;
    constructor(ctx_id: string, storage: StorageProvider, emitter?: Callable<[StorageEvent], void> | null);
    _prepare(): void;
    begin(): void;
    send_json(json_path: string, data: {}): void;
    send_file(src_path: string, dst_path: string): void;
    run(cmd: string, args?: Iterable<string>, env?: object | null): void;
    download_file(src_path: string, dst_path: string): void;
    sign(): void;
    log(args: any): void;
    commit(): Work;
}

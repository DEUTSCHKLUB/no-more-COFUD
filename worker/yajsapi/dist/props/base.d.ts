export declare function as_list(data: string | string[]): string[];
export declare class Field {
    private _value;
    private _metadata;
    private _name;
    private _type;
    constructor({ value, metadata, name, }?: {
        value?: any;
        metadata?: object;
        name?: string;
        type?: object;
    });
    set value(x: any);
    get value(): any;
    get metadata(): any;
    set name(x: any);
    get name(): any;
    get type(): any;
    valueOf(): any;
}
export declare class Model {
    constructor();
    _custom_mapping(props: object, data: object): void;
    fields(cls: any): Field[];
    from_props(props: object): any;
    keys(): any;
}

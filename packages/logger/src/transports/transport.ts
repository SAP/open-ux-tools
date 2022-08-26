import WinstonTransport from 'winston-transport';
import type { TransportOptions } from '../types';
import { LogLevel, Transport } from '../types';

export type ConsoleTransportOptions = TransportOptions;
/**
 *  This represents the console target
 */
export class ConsoleTransport extends Transport {
    private static singletonInstance: ConsoleTransport;
    public readonly options: ConsoleTransportOptions;

    constructor(opts: ConsoleTransportOptions = {}) {
        super();
        if (!ConsoleTransport.singletonInstance) {
            ConsoleTransport.singletonInstance = this;
            this.options = this.copy<ConsoleTransportOptions>(opts);
        }
        return ConsoleTransport.singletonInstance;
    }
}

export interface UI5ToolingTransportOptions extends TransportOptions {
    moduleName: string;
}

/**
 * Transport used in UI5 tooling to print to the console.
 * Don't use this together with `ConsoleTransport` or you'll have logs doubled up
 * on the console in different formats
 */
export class UI5ToolingTransport extends Transport {
    private static instances: Map<string, UI5ToolingTransport> = new Map();
    public readonly options: UI5ToolingTransportOptions;

    constructor(opts: UI5ToolingTransportOptions) {
        super();
        const instance = UI5ToolingTransport.instances.get(opts.moduleName);
        if (!instance) {
            this.options = this.copy<UI5ToolingTransportOptions>(opts);
            UI5ToolingTransport.instances.set(opts.moduleName, this);
            return this;
        } else {
            return instance;
        }
    }
}

/**
 *  Use this when you just want a sink for the logs
 */
export class NullTransport extends Transport {
    private static singletonInstance: NullTransport;

    constructor() {
        super();
        if (!NullTransport.singletonInstance) {
            NullTransport.singletonInstance = this;
        }
        return NullTransport.singletonInstance;
    }
}

export interface FileTransportOptions extends TransportOptions {
    filename: string;
}

/**
 *  This represents a file target
 */
export class FileTransport extends Transport {
    public readonly options: FileTransportOptions;

    constructor(opts: FileTransportOptions) {
        super();
        this.options = this.copy<FileTransportOptions>(opts);
    }
}

/**
 *  This target is useful when the logs need to be accumulated in an array of strings
 */
export interface StringArrayTransportOptions extends TransportOptions {
    logs: string[];
}

export class StringArrayTransport extends Transport {}

export interface VSCodeTransportOptions extends TransportOptions {
    channelName: string;
}

/**
 *  This represents an output channel in VS Code
 *  https://code.visualstudio.com/api/extension-capabilities/common-capabilities#output-channel
 */
export class VSCodeTransport extends Transport {
    private static instances: Map<string, VSCodeTransport> = new Map();
    public readonly options: VSCodeTransportOptions;

    constructor(opts: VSCodeTransportOptions) {
        super();
        const instance = VSCodeTransport.instances.get(opts.channelName);
        if (!instance) {
            this.options = this.copy<VSCodeTransportOptions>(opts);
            VSCodeTransport.instances.set(opts.channelName, this);
            return this;
        } else {
            return instance;
        }
    }
}

/**
 * Transport for logging into an array
 */
export interface ArrayTransportLogEntry {
    level: string;
    message: string;
}

export interface ArrayTransportOptions extends TransportOptions {
    logs?: ArrayTransportLogEntry[];
}

export class ArrayTransport extends WinstonTransport {
    public readonly logs: ArrayTransportLogEntry[];
    constructor(opts?: ArrayTransportOptions) {
        super({ level: typeof opts?.logLevel === 'number' ? LogLevel[opts.logLevel].toLowerCase() : 'debug' });
        this.logs = opts?.logs || [];
    }
    log(info: ArrayTransportLogEntry, next: () => void) {
        this.logs.push(info);
        next();
    }
    // Mixin from Transport
    copy = Transport.prototype.copy;
}

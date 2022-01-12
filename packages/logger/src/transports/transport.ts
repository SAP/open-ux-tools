import { Transport, TransportOptions } from '../types';

export type NullTransportOptions = TransportOptions;

/**
 *  This represents the console target
 */
export class ConsoleTransport extends Transport {
    private static singletonInstance: ConsoleTransport;
    public readonly options: NullTransportOptions;

    constructor(opts: NullTransportOptions = {}) {
        super();
        if (!ConsoleTransport.singletonInstance) {
            ConsoleTransport.singletonInstance = this;
            this.options = this.copy<NullTransportOptions>(opts);
        }
        return ConsoleTransport.singletonInstance;
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

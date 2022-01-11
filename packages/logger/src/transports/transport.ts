import { Transport, TransportOptions } from '../types';

export class ConsoleTransport extends Transport {
    private static singletonInstance: ConsoleTransport;

    constructor() {
        super();
        if (!ConsoleTransport.singletonInstance) {
            ConsoleTransport.singletonInstance = this;
        }
        return ConsoleTransport.singletonInstance;
    }
}
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

export class FileTransport extends Transport {
    public readonly options: FileTransportOptions;

    constructor(opts: FileTransportOptions) {
        super();
        this.options = this.copy<FileTransportOptions>(opts);
    }
}

export interface StringArrayTransportOptions extends TransportOptions {
    logs: string[];
}

export class StringArrayTransport extends Transport {}

export interface VSCodeTransportOptions extends TransportOptions {
    channelName: string;
}

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

import { LogLevel, Transport } from '../types';

export interface TransportOptions {
    level?: LogLevel;
}

export class ConsoleTransport extends Transport {}
export class NullTransport extends Transport {}

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
    public readonly options: VSCodeTransportOptions;

    constructor(opts: VSCodeTransportOptions) {
        super();
        this.options = this.copy<VSCodeTransportOptions>(opts);
    }
}

import { LogLevel, Transport } from '../types';
import WinstonTransport from 'winston-transport';
import winston from 'winston';
import { ConsoleTransport, FileTransport, NullTransport, VSCodeTransport } from '../transports';
import { NullTransport as WinstonNullTransport } from './null-transport';
import { VSCodeTransport as WinstonVSCodeTransport } from './vscode-output-channel-transport';

export function toWinstonLogLevel(logLevel?: LogLevel): string {
    return logLevel !== undefined ? LogLevel[logLevel].toLowerCase() : winston.level;
}

export function toWinstonTransport(transport: Transport): WinstonTransport {
    if (transport instanceof NullTransport) {
        return new WinstonNullTransport();
    } else if (transport instanceof ConsoleTransport) {
        const { logLevel, ...opts } = transport.options;
        // const options = Object.assign({}, opts, { level: toWinstonLogLevel(logLevel) });
        // return new winston.transports.Console(options);
        return new winston.transports.Console();
    } else if (transport instanceof FileTransport) {
        const { logLevel, ...opts } = transport.options;
        const options = Object.assign({}, opts, { level: toWinstonLogLevel(logLevel) });
        return new winston.transports.File(options);
    } else if (transport instanceof VSCodeTransport) {
        const { logLevel, ...opts } = transport.options;
        const options = Object.assign({}, opts, { level: toWinstonLogLevel(logLevel) });
        return new WinstonVSCodeTransport(options);
    } else {
        throw new Error('Unrecognized transport type');
    }
}

import { LogLevel, Transport } from '../types';
import WinstonTransport from 'winston-transport';
import winston from 'winston';
import { ConsoleTransport, FileTransport, NullTransport, VSCodeTransport } from '../transports';
import { NullTransport as WinstonNullTransport } from './null-transport';
import { VSCodeTransport as WinstonVSCodeTransport } from './vscode-output-channel-transport';

export function toWinstonLogLevel(logLevel?: LogLevel): string {
    return logLevel ? LogLevel[logLevel] : winston.level;
}

export function toWinstonTransport(transport: Transport): WinstonTransport {
    if (transport instanceof NullTransport) {
        return new WinstonNullTransport();
    } else if (transport instanceof ConsoleTransport) {
        return new winston.transports.Console();
    } else if (transport instanceof FileTransport) {
        const options = Object.assign({}, transport.options, { level: toWinstonLogLevel(transport.options.level) });
        return new winston.transports.File(options);
    } else if (transport instanceof VSCodeTransport) {
        const options = Object.assign({}, transport.options, { level: toWinstonLogLevel(transport.options.level) });
        return new WinstonVSCodeTransport(options);
    } else {
        throw new Error('Unrecognized transport type');
    }
}

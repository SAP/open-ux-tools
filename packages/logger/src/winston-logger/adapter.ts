import { LogLevel, Transport } from '../types';
import WinstonTransport from 'winston-transport';
import winston from 'winston';
import { ConsoleTransport, FileTransport, NullTransport, VSCodeTransport } from '../transports';
import { NullTransport as WinstonNullTransport } from './null-transport';
import { VSCodeTransport as WinstonVSCodeTransport } from './vscode-output-channel-transport';
import { format } from 'logform';
import { inspect } from 'util';

export function toWinstonLogLevel(logLevel?: LogLevel): string | undefined {
    return logLevel === undefined ? undefined : LogLevel[logLevel].toLowerCase();
}

export function toWinstonTransport(transport: Transport): WinstonTransport {
    if (transport instanceof NullTransport) {
        return new WinstonNullTransport();
    } else if (transport instanceof ConsoleTransport) {
        const { logLevel, ...opts } = transport.options;
        const options = Object.assign({}, opts, {
            level: toWinstonLogLevel(logLevel),
            format: consoleFormat
        });
        return new winston.transports.Console(options);
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

const consoleFormat = format.combine(
    process.stdout.isTTY ? format.colorize() : format.uncolorize(),
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(({ timestamp, level, message, ...meta }) => {
        const msg = typeof message === 'string' ? message : inspect(message);
        return `${timestamp} ${level}: \t${msg} ${Object.keys(meta).length ? inspect(meta) : ''}`;
    })
);

import { LogLevel, Transport, TransportOptions } from '../types';
import WinstonTransport from 'winston-transport';
import winston from 'winston';
import { ConsoleTransport, FileTransport, NullTransport, UI5ToolingTransport, VSCodeTransport } from '../transports';
import { NullTransport as WinstonNullTransport } from './null-transport';
import { VSCodeTransport as WinstonVSCodeTransport } from './vscode-output-channel-transport';
import { format, Format } from 'logform';
import { inspect } from 'util';
import chalk from 'chalk';

/**
 * Translate @type {LogLevel} to what Winston understands
 *
 * @param {LogLevel} logLevel - optional logLevel
 * @returns log - level that Winston understands (https://github.com/winstonjs/winston#logging-levels)
 */
export function toWinstonLogLevel(logLevel?: LogLevel): string | undefined {
    return logLevel === undefined ? undefined : LogLevel[logLevel].toLowerCase();
}

/**
 * Take a @type {Transport} and return the corresponding @type {WinstonTransport}
 *  Will throw an error if the transport is not recognized
 *
 * @param transport
 * @returns {WinstonTransport}
 */
export function toWinstonTransport(transport: Transport): WinstonTransport {
    if (transport instanceof NullTransport) {
        return new WinstonNullTransport();
    } else if (transport instanceof ConsoleTransport) {
        return new winston.transports.Console({
            ...toWinstonTransportOptions(transport.options),
            format: consoleFormat
        });
    } else if (transport instanceof FileTransport) {
        return new winston.transports.File(toWinstonTransportOptions(transport.options));
    } else if (transport instanceof VSCodeTransport) {
        return new WinstonVSCodeTransport(toWinstonTransportOptions(transport.options));
    } else if (transport instanceof UI5ToolingTransport) {
        return new winston.transports.Console({
            ...toWinstonTransportOptions(transport.options),
            format: ui5ToolingFormat(transport.options.moduleName)
        });
    } else {
        throw new Error('Unrecognized transport type');
    }
}

const toWinstonTransportOptions = <OPT>(transportOptions: TransportOptions): OPT & { level?: string } => {
    const { logLevel, ...opts } = transportOptions;
    return Object.assign({}, opts, { level: toWinstonLogLevel(logLevel) }) as OPT & { level?: string };
};

const consoleFormat = format.combine(
    process.stdout.isTTY ? format.colorize() : format.uncolorize(),
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(({ timestamp, level, message, ...meta }) => {
        const msg = typeof message === 'string' ? message : inspect(message);
        return `${timestamp} ${level}: \t${msg} ${Object.keys(meta).length ? inspect(meta) : ''}`;
    })
);

const ui5ToolingFormat = (moduleName: string): Format =>
    format.combine(
        format.colorize(),
        format.label({ label: moduleName }),
        format.printf(({ level, message, label }) => {
            let msg = typeof message === 'string' ? message : inspect(message);
            msg = msg.split(/\r?\n/).join(`\n${level} ${chalk.magenta(label)} `);
            return `${level} ${chalk.magenta(label)} ${msg}`;
        })
    );

import type { Transport, TransportOptions } from '../types';
import { LogLevel } from '../types';
import type WinstonTransport from 'winston-transport';
import winston, { format } from 'winston';
import {
    ConsoleTransport,
    ArrayTransport,
    FileTransport,
    NullTransport,
    UI5ToolingTransport,
    VSCodeTransport
} from '../transports';
import { NullTransport as WinstonNullTransport } from './null-transport';
import { VSCodeTransport as WinstonVSCodeTransport } from './vscode-output-channel-transport';
import type { Format } from 'logform';
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

const toWinstonTransportOptions = <OPT>(transportOptions: TransportOptions): OPT & { level?: string } => {
    const { logLevel, ...opts } = transportOptions;
    return Object.assign({}, opts, { level: toWinstonLogLevel(logLevel) }) as OPT & { level?: string };
};

const levelColor: { [level: string]: string } = {
    info: 'green',
    warn: 'yellow',
    error: 'red',
    verbose: 'blue',
    silly: 'magenta',
    debug: 'cyan'
};

const hasColorSupport = () => process.stdout.isTTY;

const colorFn = (color: string) => {
    try {
        return color ? chalk.keyword(color) : undefined;
    } catch {
        return undefined;
    }
};

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
const decorateLevel = (level: string) => {
    const padded = level.padEnd(7);
    if (hasColorSupport()) {
        const decorator = colorFn(levelColor[level]);
        if (decorator) {
            return decorator(padded);
        }
    }
    return padded;
};
/**
 * Return a colored label if label and color are specified, _if_ we running on a TTY.
 * Else return `''`
 * @param label
 * @param labelColor
 * @returns {string} decorated label
 */
const decorateLabel = (label?: string, labelColor?: string): string => {
    let l = label ?? '';
    if (hasColorSupport() && label && typeof labelColor === 'string') {
        const decorator = colorFn(labelColor);
        if (decorator) {
            l = decorator(label);
        }
    }
    return l;
};
const consoleFormat = format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(({ timestamp, level, message, label, labelColor, ...meta }) => {
        const msg = typeof message === 'string' ? message : inspect(message);
        const lvl = decorateLevel(level);
        return `${timestamp} ${lvl} ${decorateLabel(label, labelColor)}: ${msg} ${
            Object.keys(meta).length ? inspect(meta) : ''
        }`;
    })
);

/**
 * Take a @type {Transport} and return the corresponding @type {WinstonTransport}
 *  Will throw an error if the transport is not recognized
 *
 * @param transport
 * @returns {WinstonTransport} winston transport
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
    } else if (transport instanceof ArrayTransport) {
        return transport;
    } else {
        throw new Error('Unrecognized transport type');
    }
}

import { ConsoleTransport } from '../transports';
import { Logger, LogLevel, Transport } from '../types';
import winston from 'winston';
import { toWinstonLogLevel, toWinstonTransport } from './adapter';
import WinstonTransport from 'winston-transport';
import { format } from 'logform';

export interface LoggerOptions {
    logLevel?: LogLevel;
    transports?: Transport[];
}

const defaultLoggerOptions: LoggerOptions = {
    transports: [new ConsoleTransport()]
};

export class WinstonLogger implements Logger {
    private _logger;
    private transportMap: Map<Transport, WinstonTransport> = new Map();
    constructor({ logLevel, transports }: LoggerOptions = defaultLoggerOptions) {
        (transports || []).forEach((t) => this.addToMap(t));
        const level = toWinstonLogLevel(logLevel || LogLevel.Info);

        this._logger = winston.createLogger({
            level,
            transports: Array.from(this.transportMap.values()),
            format: format.combine(format.timestamp(), winston.format.json())
        });
    }

    info(message: string | object): void {
        this.transportMap.size && this._logger.info(message);
    }
    warn(message: string | object): void {
        this.transportMap.size && this._logger.warn(message);
    }
    error(message: string | object): void {
        this.transportMap.size && this._logger.error(message);
    }
    debug(message: string | object): void {
        this.transportMap.size && this._logger.debug(message);
    }
    private addToMap(transport: Transport): WinstonTransport | undefined {
        const winstonTransport = toWinstonTransport(transport);
        if (!this.transportMap.has(transport)) {
            this.transportMap.set(transport, winstonTransport);
            return winstonTransport;
        }
        return undefined;
    }

    add(transport: Transport) {
        const winstonTransport = this.addToMap(transport);

        if (winstonTransport) {
            this._logger.add(winstonTransport);
        }
        return this;
    }
    remove(transport: Transport) {
        const winstonTransport = this.transportMap.get(transport);
        if (winstonTransport) {
            this._logger.remove(winstonTransport);
            this.transportMap.delete(transport);
            return this;
        } else {
            throw new Error('Cannot remove non-existent transport');
        }
    }
    transports(): Transport[] {
        return Array.from(this.transportMap.keys());
    }
}

import { ConsoleTransport } from '../transports';
import { Logger, LogLevel, Transport } from '../types';
import winston from 'winston';
import { toWinstonLogLevel, toWinstonTransport } from './adapter';
import WinstonTransport from 'winston-transport';

export interface LoggerOptions {
    logLevel: LogLevel;
    transports: Transport[];
}

const defaultLoggerOptions: LoggerOptions = {
    logLevel: LogLevel.Info,
    transports: [new ConsoleTransport()]
};

export class WinstonLogger implements Logger {
    private _logger;
    private transportMap: Map<Transport, WinstonTransport> = new Map();
    constructor({ logLevel, transports }: LoggerOptions = defaultLoggerOptions) {
        transports.forEach((t) => this.transportMap.set(t, toWinstonTransport(t)));
        this._logger = winston.createLogger({
            level: toWinstonLogLevel(logLevel),
            transports: Array.from(this.transportMap.values())
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
    add(transport: Transport) {
        const winstonTransport = toWinstonTransport(transport);
        this.transportMap.set(transport, winstonTransport);
        this._logger.add(winstonTransport);
        return this;
    }
    remove(transport: Transport) {
        const winstonTransport = this.transportMap.get(transport);
        if (winstonTransport) {
            this._logger.remove(winstonTransport);
        } else {
            throw new Error('Cannot remove non-existent transport');
        }
        return this;
    }
    transports(): Transport[] {
        return Array.from(this.transportMap.keys());
    }
}

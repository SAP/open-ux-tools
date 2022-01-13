import { ConsoleTransport } from '../transports';
import { ChildLoggerOptions, Log, Logger, LoggerOptions, LogLevel, Transport } from '../types';
import winston from 'winston';
import { toWinstonLogLevel, toWinstonTransport } from './adapter';
import WinstonTransport from 'winston-transport';
import { format } from 'logform';
import { nextColor } from './utils';

const defaultLoggerOptions: LoggerOptions = {
    transports: [new ConsoleTransport()]
};

interface BaseLoggerOptions {
    logger: winston.Logger;
    transportMap: Map<Transport, WinstonTransport>;
    winstonLevel: string;
    logPrefix: string;
}

class BaseWinstonLogger implements Logger {
    protected _logger: winston.Logger;
    protected logPrefix: string;
    protected winstonLevel: string;
    // Maintain of map of transports. This is useful for adding/removing transports
    protected transportMap: Map<Transport, WinstonTransport>;
    protected initialize({ logger, transportMap, winstonLevel, logPrefix }: BaseLoggerOptions): void {
        this._logger = logger;
        this.transportMap = transportMap;
        this.winstonLevel = winstonLevel;
        this.logPrefix = logPrefix;
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
    log(data: string | Log): void {
        if (!this.transportMap.size) {
            // Nothing to do
            return;
        }
        if (typeof data === 'string') {
            this._logger.log(this.winstonLevel, data);
        } else {
            this._logger.log(toWinstonLogLevel(data.level)!, data.message);
        }
    }

    protected addToMap(
        transportMap: Map<Transport, WinstonTransport>,
        transport: Transport
    ): WinstonTransport | undefined {
        const winstonTransport = toWinstonTransport(transport);
        if (!transportMap.has(transport)) {
            transportMap.set(transport, winstonTransport);
            return winstonTransport;
        }
        return undefined;
    }

    add(transport: Transport) {
        const winstonTransport = this.addToMap(this.transportMap, transport);

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
    child({ logPrefix }: ChildLoggerOptions): Logger {
        const childLogPrefix = `${this.logPrefix}.${logPrefix}`;
        const childWinstonLogger = this._logger.child({ label: childLogPrefix, labelColor: nextColor() });
        const childLogger = new BaseWinstonLogger();
        childLogger.initialize({
            logger: childWinstonLogger,
            transportMap: this.transportMap,
            winstonLevel: this.winstonLevel,
            logPrefix: childLogPrefix
        });
        return childLogger;
    }
}

/**
 *  Winston implementation of the @type {Logger} interface
 */
export class WinstonLogger extends BaseWinstonLogger {
    private childMap: Map<string, BaseWinstonLogger>;

    constructor({
        logLevel = LogLevel.Info,
        transports = [],
        logPrefix = 'main'
    }: LoggerOptions = defaultLoggerOptions) {
        super();
        const transportMap: Map<Transport, WinstonTransport> = new Map();
        transports.forEach((t) => this.addToMap(transportMap, t));
        const level = toWinstonLogLevel(logLevel);

        const logger = winston.createLogger({
            level,
            transports: Array.from(transportMap.values()),
            format: format.combine(format.timestamp(), winston.format.json()),
            defaultMeta: { label: logPrefix, labelColor: nextColor() }
        });
        const winstonLevel = level ?? logger.level;
        this.initialize({ logger, transportMap, winstonLevel, logPrefix });
    }
}

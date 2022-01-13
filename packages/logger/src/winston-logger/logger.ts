import { ConsoleTransport } from '../transports';
import { ChildLoggerOptions, Log, Logger, LoggerOptions, LogLevel, Transport } from '../types';
import winston from 'winston';
import { toWinstonLogLevel, toWinstonTransport } from './adapter';
import WinstonTransport from 'winston-transport';
import { format } from 'logform';
import { nextColor } from './utils';
import { inspect } from 'util';

const defaultLoggerOptions: LoggerOptions = {
    transports: [new ConsoleTransport()]
};

type Metadata = {
    [key: string]: unknown;
};
interface BaseLoggerOptions {
    logger: winston.Logger;
    transportMap: Map<Transport, WinstonTransport>;
    winstonLevel: string;
    logPrefix: string;
    metadataOverride?: Metadata;
}

class BaseWinstonLogger implements Logger {
    protected _logger: winston.Logger;
    protected logPrefix: string;
    protected logPrefixColor: string;
    protected winstonLevel: string;
    protected metadataOverride?: Metadata;
    // Maintain of map of transports. This is useful for adding/removing transports
    protected transportMap: Map<Transport, WinstonTransport>;
    protected initialize({ logger, transportMap, metadataOverride, winstonLevel, logPrefix }: BaseLoggerOptions): void {
        this._logger = logger;
        this.transportMap = transportMap;
        this.winstonLevel = winstonLevel;
        this.logPrefix = logPrefix;
        this.metadataOverride = metadataOverride;
    }

    info(message: string | object): void {
        this.transportMap.size && this.winstonLog({ level: 'info', message, metadata: this.metadataOverride });
    }
    warn(message: string | object): void {
        this.transportMap.size && this.winstonLog({ level: 'warn', message, metadata: this.metadataOverride });
    }
    error(message: string | object): void {
        this.transportMap.size && this.winstonLog({ level: 'error', message, metadata: this.metadataOverride });
    }
    debug(message: string | object): void {
        this.transportMap.size && this.winstonLog({ level: 'debug', message, metadata: this.metadataOverride });
    }
    log(data: string | Log): void {
        if (!this.transportMap.size) {
            // Nothing to do
            return;
        }
        if (typeof data === 'string') {
            this.winstonLog({ level: this.winstonLevel, message: data, metadata: this.metadataOverride });
        } else {
            const level = toWinstonLogLevel(data.level) ?? this._logger.level;
            this.winstonLog({ level, message: data.message, metadata: this.metadataOverride });
        }
    }
    private winstonLog({
        level,
        message,
        metadata
    }: {
        level: string;
        message: string | object;
        metadata?: Metadata;
    }): void {
        const msg = typeof message === 'string' ? message : inspect(message);
        this._logger.log(level, msg, metadata);
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
        const metadataOverride = { label: childLogPrefix, labelColor: nextColor() };
        const childWinstonLogger = this._logger.child(metadataOverride);
        const childLogger = new BaseWinstonLogger();
        childLogger.initialize({
            logger: childWinstonLogger,
            transportMap: this.transportMap,
            winstonLevel: this.winstonLevel,
            logPrefix: childLogPrefix,
            metadataOverride
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

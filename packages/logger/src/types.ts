import cloneDeep from 'lodash.clonedeep';

/**
 * Definition of log method signature.
 */
export type LogMethod = (message: string | object) => void;

/**
 *  This represents an instance of a message to log
 */
export interface Log {
    level: LogLevel;
    message: string | object;
}

export interface ChildLoggerOptions {
    logPrefix: string;
}

/**
 * Generic logger interface supported e.g. by console and @ui5/logger
 */
export interface Logger {
    info: LogMethod;
    warn: LogMethod;
    error: LogMethod;
    debug: LogMethod;

    /**
     *
     * @param {string | Log} data - the information to log. If a string is passed in, the logger's default log level is used.
     * Otherwise the level passed in is used
     */
    log(data: string | Log): void;
    /**
     * Add a given transport. Whether the logger using multiple transports or the added transport
     *  replaces an existing one is up to the implementation
     */
    add(transport: Transport): Logger;
    /**
     * Remove the given transport instance
     */
    remove(transport: Transport): Logger;
    /**
     * Returns a list of current transport instances
     */
    transports(): Transport[];
    /**
     * Create a child logger
     * @param options
     */
    child(options: ChildLoggerOptions): Logger;
}

/**
 * Follows severity ordering specificed in RFC 5424: https://datatracker.ietf.org/doc/html/rfc5424
 */
export enum LogLevel {
    Error = 0,
    Warn = 1,
    Info = 2,
    Verbose = 3,
    Debug = 4,
    Silly = 5
}

export interface TransportOptions {
    logLevel?: LogLevel;
}
/**
 *  This is the base abstract transport class. A transport is a destination for the logs.
 *  Concrete classes are defined separately
 */
export abstract class Transport {
    /**
     * A utility copy method to make immutable, deep copies of objects
     * @param obj
     * @returns  a frozen deep clone of `obj`
     */
    copy<T>(obj: T): T {
        return Object.freeze(cloneDeep(obj)) as unknown as T;
    }
}

export interface LoggerOptions {
    /**
     * Log only if severity is equal to or greater than this log level.
     * Defaults to `LogLevel.Info`. Transports can optionally have their own log levels
     */
    logLevel?: LogLevel;
    /**
     * Array of transports @type {Transport[]} or destinations for the logs
     */
    transports?: Transport[];
    /**
     * Prefix for the logs. Defaults to `main` if not supplied
     */
    logPrefix?: string;
}

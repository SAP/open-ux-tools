import { Debugger } from 'debug';
import cloneDeep from 'lodash.clonedeep';

/**
 * Definition of log method signature.
 */
export type LogMethod = (message: string | object) => void;

/**
 * Generic logger interface supported e.g. by console and @ui5/logger
 */
export interface Logger {
    info: LogMethod;
    warn: LogMethod;
    error: LogMethod;
    debug: LogMethod;
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
}

/**
 * Extended logger interface also supporting debug logs.
 */
export interface ExtendedLogger extends Logger {
    debug: Debugger;
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
export class Transport {
    /**
     *
     * @param obj
     * @returns  a frozen deep clone of `obj`
     */
    copy<T>(obj: T): T {
        return Object.freeze(cloneDeep(obj)) as unknown as T;
    }
}

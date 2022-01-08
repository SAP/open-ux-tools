import { Debugger } from 'debug';
import cloneDeep from 'lodash/cloneDeep';

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
    add(transport: Transport): Logger;
    remove(transport: Transport): Logger;
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
    Http = 3,
    Verbose = 4,
    Debug = 5,
    Silly = 6
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

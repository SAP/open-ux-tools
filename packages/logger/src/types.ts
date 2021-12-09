import { Debugger } from 'debug';

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
}

/**
 * Extended logger interface also supporting debug logs.
 */
export interface ExtendedLogger extends Logger {
    debug: Debugger;
}

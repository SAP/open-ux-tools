import { debug as d } from 'debug';
import { Logger as CommonLogger } from '@sap-ux/logger';
import { homedir } from 'os';
import path from 'path';

export const STORE_NAMESPACE = 'ft:store';
export const MIGRATION_NAMESPACE = STORE_NAMESPACE + ':migrate';
export const newDebugLogger = (namespace = STORE_NAMESPACE): debug.Debugger => d(namespace);
export const enableDebugLogger = (namespace: string): void => d.enable(namespace);

/** Pick the properties listed and return a new object with a shallow-copy */
export const pick = <T>(target: T, ...props: Array<keyof T>): Partial<T> | undefined => {
    return (
        (target &&
            props?.length > 0 &&
            props.reduce((o, k) => {
                o[k] = target[k];
                return o;
            }, {} as T)) ||
        undefined
    );
};

export interface Logger extends CommonLogger {
    debug: debug.Debugger;
}

/**
 * Extend the logger to add a debug method
 * @param l
 */
export function getExtendedLogger(l: CommonLogger): Logger {
    return {
        ...l,
        debug: newDebugLogger()
    };
}

/** Given an `Error` or any other object thrown, returns an `Error` instance */
export function errorInstance(e: Error | unknown): NodeJS.ErrnoException {
    if (e instanceof Error) {
        return e;
    } else {
        return new Error(String(e));
    }
}

/** If input in an instance of `Error` return the message property,
 *  otherwise convert the input to its string representation
 */
export function errorString(e: Error | unknown): string {
    return e instanceof Error ? e.message : String(e);
}

export enum FioriToolsSettings {
    dir = '.fioritools'
}

export const getFioriToolsDirectory = (): string => {
    return path.join(homedir(), FioriToolsSettings.dir);
};

export * from './app-studio';

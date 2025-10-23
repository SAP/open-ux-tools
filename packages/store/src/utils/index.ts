import { homedir } from 'node:os';
import { join } from 'node:path';
import { plural } from 'pluralize';

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

export enum SapTools {
    dir = '.saptools'
}

export const getFioriToolsDirectory = (): string => {
    return join(homedir(), FioriToolsSettings.dir);
};

export const getSapToolsDirectory = (): string => {
    return join(homedir(), SapTools.dir);
};

/**
 * Trims, lowercases and returns plural if a non-empty string
 *
 * @param s
 */
export function toPersistenceName(s: string): string | undefined {
    const t = s?.trim().toLowerCase();
    return t && plural(t);
}

export function getEntityFileName(entityName: string): string {
    return toPersistenceName(entityName) + '.json';
}

export * from './app-studio';
export * from './backend';

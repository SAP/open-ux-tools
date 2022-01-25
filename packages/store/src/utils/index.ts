import { homedir } from 'os';
import path from 'path';

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

export const getFioriToolsDirectory = (): string => {
    return path.join(homedir(), FioriToolsSettings.dir);
};

export * from './app-studio';

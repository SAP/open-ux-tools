import type { Logger, ResultMessage } from './types';
import { Severity } from './types';

/**
 * Return a logger to log messages. Once done adding messages, call getMessages()
 * to retrive an array of logged messages.
 *
 * @returns logger to log messages
 */
export function getLogger(): Logger {
    const messages: ResultMessage[] = [];
    return {
        info: (text): void => {
            messages.push({ severity: Severity.Info, text });
        },
        log: (text): void => {
            messages.push({ severity: Severity.Log, text });
        },
        warning: (text): void => {
            messages.push({ severity: Severity.Warning, text });
        },
        error: (text): void => {
            messages.push({ severity: Severity.Error, text });
        },
        push: (...newMessages): void => {
            messages.push(...newMessages);
        },
        getMessages: (): ResultMessage[] => messages
    };
}

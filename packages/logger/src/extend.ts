import { debug } from 'debug';
import { ExtendedLogger, Logger } from 'types';

/**
 * Extend the logger to add a debug method
 * @param logger: existing logger instance
 */
export function extendLogger(logger: Logger, namespace: string): ExtendedLogger {
    debug.enable(namespace);
    return {
        ...logger,
        debug: debug(namespace)
    };
}

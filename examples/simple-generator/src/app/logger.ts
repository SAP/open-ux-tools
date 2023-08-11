import type { Logger } from '@sap-ux/logger';
import type Generator from 'yeoman-generator';

let logger: Logger;

const notImplemented = () => {
    throw new Error('Not implemented');
};

/**
 * Wrapping the yeoman logger as @sap-ux/logger.
 *
 * @param generator yeaman generator instance
 * @returns an instance of the @sap-ux/logger
 */
export function getLogger(generator: Generator) {
    if (!logger) {
        logger = {
            log: generator.log,
            debug: generator.log,
            info: generator.log.info,
            warn: generator.log,
            error: generator.log.error,
            add: notImplemented,
            remove: notImplemented,
            child: notImplemented,
            transports: notImplemented
        };
    }
    return logger;
}

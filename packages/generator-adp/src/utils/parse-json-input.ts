import type { ToolsLogger } from '@sap-ux/logger';
import type { JsonInput } from '../app/types';
import { isJsonInput, isString } from './type-guards';

/**
 * Returns the first argument from a list of CLI arguments. If the first argument
 * is not a string returns empty string.
 *
 * @param {string | string[]} args - The list of CLI command arguments.
 * @returns {string} The first parameter in the argument's list as string.
 */
export function getFirstArgAsString(args: string | string[]): string {
    if (isString(args)) {
        return args;
    }

    if (Array.isArray(args) && args.length) {
        return args[0];
    }

    return '';
}

/**
 * Parse a json string as an object conforming to the {@link JsonInput} interface.
 *
 * @param {string} jsonString - The json string representation.
 * @param {ToolsLogger} logger - The logger instance.
 * @returns {JsonInput | undefined} The parsed json object, in case of an error or
 * if the object does not match the above interface - returns undefined.
 */
export function parseJsonInput(jsonString: string, logger: ToolsLogger): JsonInput | undefined {
    try {
        const parsed = JSON.parse(jsonString);

        if (!isJsonInput(parsed)) {
            return undefined;
        }

        return parsed;
    } catch (error) {
        logger.debug(`Failed to parse adp JSON input: ${error.message}`);
        return undefined;
    }
}

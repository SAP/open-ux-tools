import type { AdpJsonInput } from '../app/types';
import { isAdpJsonInput, isString } from './type-guards';

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
 * Parse a json string as an object conforming to the {@link AdpJsonInput} interface.
 *
 * @param {string} jsonString - The json string representation.
 * @returns {AdpJsonInput | undefined} The parsed json object, in case of an error or
 * if the object does not match the above interface - returns undefined.
 */
export function parseAdpJsonInput(jsonString: string): AdpJsonInput | undefined {
    try {
        const parsed = JSON.parse(jsonString);

        if (!isAdpJsonInput(parsed)) {
            return undefined;
        }

        return parsed;
    } catch (error) {
        return undefined;
    }
}

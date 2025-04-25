import { isRecordOfStrings, isString } from './type-guards';

/**
 * Returns the first argument from a list of CLI arguments. If the first argument
 * is not a string returns empty string.
 *
 * @param args The list of CLI command arguments.
 * @returns The first parameter in the argument's list as string.
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
 * Parse a json string as plain object and validates that all its values are of type
 * string.
 *
 * @param jsonString The json string representation.
 * @returns The parsed json object, in case of an error returns undefined.
 */
export function parseJsonInput(jsonString: string): Record<string, string> | undefined {
    try {
        const parsed = JSON.parse(jsonString);

        if (!isRecordOfStrings(parsed)) {
            return;
        }

        return parsed;
    } catch (error) {
        // Do nothing.
    }
}

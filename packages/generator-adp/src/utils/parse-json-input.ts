import type { ToolsLogger } from '@sap-ux/logger';
import type { CfJsonInput, JsonInput } from '../app/types.js';
import { TargetEnv } from '../app/types.js';
import { isCfJsonInput, isJsonInput, isString } from './type-guards.js';

/**
 * Returns the first argument from a list of CLI arguments. If the first argument
 * is not a string and not an array, returns empty string.
 *
 * @param {T | T[]} args - The list of CLI command arguments.
 * @returns {T | string} The first parameter in the argument's list, or empty string if the format is unexpected.
 */
export function getFirstArg<T>(args: T | T[]): T | string {
    if (isString(args)) {
        return args;
    }

    if (Array.isArray(args) && args.length) {
        return args[0];
    }

    return '';
}

/**
 * Parse a json string as an object conforming to the {@link JsonInput} (ABAP) or {@link CfJsonInput}
 * (Cloud Foundry) interface. Routing is driven by the `targetEnv` discriminator: `'CF'` selects the
 * CF shape, anything else (including an absent `targetEnv`) is treated as ABAP for backwards
 * compatibility.
 *
 * @param {string} jsonString - The json string representation.
 * @param {ToolsLogger} logger - The logger instance.
 * @returns {JsonInput | CfJsonInput | undefined} The parsed json object, or `undefined` when the
 * string is not valid json or does not match the expected shape for its target environment.
 */
export function parseJsonInput(jsonString: string, logger: ToolsLogger): JsonInput | CfJsonInput | undefined {
    try {
        const parsed = JSON.parse(jsonString);

        if (isPlainTargetEnvCf(parsed)) {
            return isCfJsonInput(parsed) ? parsed : undefined;
        }

        if (!isJsonInput(parsed)) {
            return undefined;
        }

        return parsed;
    } catch (error) {
        logger.debug(`Failed to parse adp JSON input: ${error.message}`);
        return undefined;
    }
}

/**
 * Narrow check for whether a parsed json selects the Cloud Foundry target environment.
 *
 * @param {unknown} value - The parsed json value.
 * @returns {boolean} True if the value is an object whose `targetEnv` is `'CF'`.
 */
function isPlainTargetEnvCf(value: unknown): boolean {
    return typeof value === 'object' && value !== null && (value as { targetEnv?: unknown }).targetEnv === TargetEnv.CF;
}

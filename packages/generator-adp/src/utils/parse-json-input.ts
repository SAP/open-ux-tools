import type { ToolsLogger } from '@sap-ux/logger';
import type { CfJsonInput, JsonInput } from '../app/types.js';
import { TargetEnv } from '../app/types.js';
import { isCfJsonInput, isAbapJsonInput, isString } from './type-guards.js';
import { t } from './i18n.js';

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
 * The reason a JSON input string failed to parse into a valid {@link JsonInput} or {@link CfJsonInput}.
 *
 * - `syntax` — the string is not valid JSON.
 * - `cf-shape` — selects the Cloud Foundry environment (`targetEnv: 'CF'`) but does not satisfy {@link isCfJsonInput}.
 * - `abap-shape` — does not select Cloud Foundry and does not satisfy the ABAP {@link isAbapJsonInput} contract.
 */
export type ParseFailure = 'syntax' | 'cf-shape' | 'abap-shape';

/**
 * Builds the localized error message for a {@link ParseFailure}, keeping the text simple while still
 * naming the target environment (ABAP / Cloud Foundry) for a shape mismatch. A syntax failure has no
 * environment, so it uses its own message.
 *
 * @param {ParseFailure} reason - Why the JSON input was rejected.
 * @returns {string} The localized error message.
 */
export function getInvalidJsonInputMessage(reason: ParseFailure): string {
    if (reason === 'syntax') {
        return t('error.invalidJsonSyntax');
    }
    const env = reason === 'cf-shape' ? 'Cloud Foundry' : 'ABAP';
    return t('error.invalidJsonInput', { env });
}

/**
 * Discriminated result of {@link parseJsonInput}: either the parsed input, or the reason it failed.
 */
export type ParseJsonResult = { ok: true; input: JsonInput | CfJsonInput } | { ok: false; reason: ParseFailure };

/**
 * Parse a json string as an object conforming to the {@link JsonInput} (ABAP) or {@link CfJsonInput}
 * (Cloud Foundry) interface. Routing is driven by the `targetEnv` discriminator: `'CF'` selects the
 * CF shape, anything else (including an absent `targetEnv`) is treated as ABAP for backwards
 * compatibility.
 *
 * @param {string} jsonString - The json string representation.
 * @param {ToolsLogger} logger - The logger instance.
 * @returns {ParseJsonResult} `{ ok: true, input }` for a valid input, otherwise `{ ok: false, reason }`
 * describing whether the failure was a JSON syntax error, a CF-shape mismatch or an ABAP-shape mismatch.
 */
export function parseJsonInput(jsonString: string, logger: ToolsLogger): ParseJsonResult {
    let parsed: unknown;
    try {
        parsed = JSON.parse(jsonString);
    } catch (error) {
        logger.debug(`Failed to parse adp JSON input: ${error.message}`);
        return { ok: false, reason: 'syntax' };
    }

    if (isPlainTargetEnvCf(parsed)) {
        return isCfJsonInput(parsed) ? { ok: true, input: parsed } : { ok: false, reason: 'cf-shape' };
    }

    if (!isAbapJsonInput(parsed)) {
        return { ok: false, reason: 'abap-shape' };
    }

    return { ok: true, input: parsed };
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

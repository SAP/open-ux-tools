import { isAbsolute, relative, sep } from 'node:path';

/**
 * Narrow an unknown value to a plain JSON-like object (not null, not an array).
 *
 * @param value value to check
 * @returns true when the value is a non-array object
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

const SHA256_HEX = /^[0-9a-f]{64}$/u;

/**
 * Whether a value is a SHA-256 digest written as 64 lowercase hexadecimal characters.
 *
 * @param value value to check
 * @returns true for a lowercase hexadecimal SHA-256 digest
 * @example
 * isSha256Hex('ab'.repeat(32)); // true
 * isSha256Hex('AB'.repeat(32)); // false
 */
export function isSha256Hex(value: unknown): value is string {
    return typeof value === 'string' && SHA256_HEX.test(value);
}

/**
 * Whether a path lies inside a root directory, or is the root itself. Both paths must be resolved
 * (absolute) already; symbolic links are not followed here.
 *
 * @param root the containing directory
 * @param candidate the path to check
 * @returns true when `candidate` is `root` or a descendant of it
 * @example
 * isPathInside('/app', '/app/webapp/data'); // true
 * isPathInside('/app', '/application'); // false
 */
export function isPathInside(root: string, candidate: string): boolean {
    const path = relative(root, candidate);
    return path === '' || (!isAbsolute(path) && path !== '..' && !path.startsWith(`..${sep}`));
}

/**
 * The text of a caught value: an Error's message, or the value as a string.
 *
 * @param error the caught value
 * @returns the message to report
 * @example
 * errorMessage(new TypeError('bad input')); // 'bad input'
 */
export function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

/**
 * The Node.js system error code of a caught value, such as `ENOENT`.
 *
 * @param error the caught value
 * @returns the string `code` of the error, or undefined when it has none
 * @example
 * try { await stat(path); } catch (error) { if (errnoCode(error) !== 'ENOENT') throw error; }
 */
export function errnoCode(error: unknown): string | undefined {
    // Checked structurally: errors from Node core can come from another realm, where `instanceof Error` fails.
    const code: unknown = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
    return typeof code === 'string' ? code : undefined;
}

/**
 * Whether a caught value is an error of the given built-in kind, checked by name so that errors raised by
 * host objects of another realm (for example `TextDecoder` under a test sandbox) are recognised too.
 *
 * @param error the caught value
 * @param name the error name, such as `TypeError`
 * @returns true when the value is an object whose `name` is `name`
 */
export function isErrorNamed(error: unknown, name: string): boolean {
    return typeof error === 'object' && error !== null && 'name' in error && error.name === name;
}

/**
 * Shared helpers for utilities that read, splice, and write back generated test files in place.
 */

/**
 * Maximum file size, in characters, that the in-place splicers will attempt to update.
 * Files larger than this are returned unchanged to prevent ReDoS on crafted inputs.
 * Valid generator output is well within this limit.
 */
export const MAX_FILE_CONTENT_LENGTH = 20000;

/**
 * Escape regex metacharacters in `value` so it can be safely embedded in a `RegExp` pattern.
 *
 * @param value - the string to escape
 * @returns the escaped string
 */
export function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

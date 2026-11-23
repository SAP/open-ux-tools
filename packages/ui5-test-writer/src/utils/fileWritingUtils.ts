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

/**
 * Walk forward from `openBraceIdx` and return the index of the matching closing `}`,
 * accounting for nested braces.
 *
 * @param content - the file content
 * @param openBraceIdx - the index of the `{` that opens the block
 * @returns the index of the matching closing `}` (or `content.length` if unterminated)
 */
export function findMatchingClosingBrace(content: string, openBraceIdx: number): number {
    let depth = 1;
    let index = openBraceIdx + 1;
    while (index < content.length && depth > 0) {
        const character = content[index];
        if (character === '{') {
            depth++;
        } else if (character === '}') {
            depth--;
        }
        if (depth === 0) {
            break;
        }
        index++;
    }
    return index;
}

/**
 * Return the index immediately after the last `import ... from "..."` line in `content`,
 * or `-1` if the content has no `import` lines.
 *
 * @param content - the file content to scan
 * @returns the index immediately after the last import line, or -1 if none found
 */
export function findLastImportEnd(content: string): number {
    const importLineRegex = /^import\b[^\n]*?\bfrom[ \t]+["'][^"']+["'];?[ \t]*$/gm;
    let lastImportEnd = -1;
    let importMatch: RegExpExecArray | null;
    while ((importMatch = importLineRegex.exec(content)) !== null) {
        lastImportEnd = importMatch.index + importMatch[0].length;
    }
    return lastImportEnd;
}

/**
 * Insert `newImportLines` after the last existing `import` line in `content`.
 * Returns `content` unchanged if it has no `import` lines.
 *
 * @param content - the file content
 * @param newImportLines - the import lines to insert (no leading newline)
 * @returns the updated content
 */
export function insertAfterLastImport(content: string, newImportLines: string[]): string {
    if (newImportLines.length === 0) {
        return content;
    }
    const lastImportEnd = findLastImportEnd(content);
    if (lastImportEnd < 0) {
        return content;
    }
    const newImports = newImportLines.map((line) => `\n${line}`).join('');
    return `${content.slice(0, lastImportEnd)}${newImports}${content.slice(lastImportEnd)}`;
}

/**
 * Locate a braced block introduced by a header pattern (e.g. `pages: {`) and return the
 * indices of its opening and matching closing braces, accounting for nested braces.
 *
 * @param content - the file content
 * @param headerRegex - regex matching the block header up to and including (or just before) the `{`
 * @returns the brace indices, or undefined if the block can't be located
 */
export function findBracedBlock(
    content: string,
    headerRegex: RegExp
): { openBraceIdx: number; closeBraceIdx: number } | undefined {
    const match = headerRegex.exec(content);
    if (!match) {
        return undefined;
    }
    const openBraceIdx = content.indexOf('{', match.index + match[0].length - 1);
    if (openBraceIdx < 0) {
        return undefined;
    }
    const closeBraceIdx = findMatchingClosingBrace(content, openBraceIdx);
    if (closeBraceIdx >= content.length) {
        return undefined;
    }
    return { openBraceIdx, closeBraceIdx };
}

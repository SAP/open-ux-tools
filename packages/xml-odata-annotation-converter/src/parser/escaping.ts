const ESCAPE_MAPPINGS: Record<string, string> = {
    '&apos;': "'",
    '&gt;': '>',
    '&lt;': '<',
    '&amp;': '&',
    '&quot;': '"'
};

/**
 * Replaces XML escape sequences with their matching special characters.
 *
 * @param input text with escape sequences
 * @returns text with special characters
 */
export function removeEscapeSequences(input: string): string {
    return input.replace(/(&apos;|&lt;|&gt;|&amp;|&quot;)/g, (_str, item: string) => ESCAPE_MAPPINGS[item]);
}

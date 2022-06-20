const ESCAPE_MAPPINGS: Record<string, string> = { '&lt;': '<', '&amp;': '&', '&quot;': '"' };
export function removeEscapeSequences(input: string): string {
    return input.replace(/(&lt;|&amp;|&quot;)/g, (_str, item: string) => ESCAPE_MAPPINGS[item]);
}

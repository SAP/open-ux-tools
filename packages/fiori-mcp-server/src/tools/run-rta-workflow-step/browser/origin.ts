/**
 * Normalises a URL to its origin (scheme + host + port). Returns the raw input
 * when it cannot be parsed, so callers always get a usable map key.
 *
 * @param url URL or origin string.
 * @returns The origin, or the input unchanged if unparseable.
 */
export function originKey(url: string): string {
    try {
        return new URL(url).origin;
    } catch {
        return url;
    }
}

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

/**
 * Whether `host` is a loopback host the adaptation editor may bind to: `localhost`,
 * IPv4 loopback (`127.0.0.1`), or IPv6 loopback (`::1`). `new URL(...).hostname`
 * keeps the brackets for IPv6 (`http://[::1]:8080` → `[::1]`), so both the bracketed
 * and bare forms are accepted.
 *
 * @param host A URL hostname (as returned by `new URL(...).hostname`).
 * @returns `true` when the host is a loopback address.
 */
export function isLoopbackHost(host: string): boolean {
    return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]';
}

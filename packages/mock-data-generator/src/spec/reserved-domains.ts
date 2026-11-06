/**
 * Domain names reserved for documentation and testing, which no one can register, so a generated address
 * never reaches a real host:
 * - the second-level domains `example.com`, `example.net` and `example.org` (RFC 2606 section 3);
 * - the top-level domains `test`, `example`, `invalid` and `localhost` (RFC 2606 section 2, RFC 6761 section 6).
 *
 * @see https://www.rfc-editor.org/rfc/rfc2606
 * @see https://www.rfc-editor.org/rfc/rfc6761
 */
export const RESERVED_SECOND_LEVEL_DOMAINS: ReadonlyArray<string> = Object.freeze([
    'example.com',
    'example.net',
    'example.org'
]);

/** The reserved top-level domains (RFC 2606 section 2, RFC 6761 section 6). */
export const RESERVED_TOP_LEVEL_DOMAINS: ReadonlyArray<string> = Object.freeze([
    'test',
    'example',
    'invalid',
    'localhost'
]);

/** The reserved domain a generated address takes in place of another. */
export const DOCUMENTATION_DOMAIN = 'example.com';

// A host name of at least two labels whose last label holds letters only, so an IP address is no host here.
const HOST = String.raw`[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}`;
const EMAIL = new RegExp(String.raw`^([^\s@]+@)(${HOST})$`, 'u');
const URL_WITH_SCHEME = new RegExp(
    String.raw`^([A-Za-z][A-Za-z0-9+.-]*://(?:[^\s/@]+@)?)(${HOST})((?:[:/?#]\S*)?)$`,
    'u'
);
const WEB_HOST = new RegExp(String.raw`^()(www\.${HOST})((?:[:/?#]\S*)?)$`, 'iu');

/** The host of a value that is an e-mail address or a web address, and the parts around it. */
export interface WebAddress {
    /** What precedes the host: the local part and `@`, or the scheme and user information. */
    prefix: string;
    /** The host name. */
    host: string;
    /** What follows the host: port, path, query and fragment. */
    suffix: string;
}

/**
 * The host of a value that is, as a whole, an e-mail address, a URL with a scheme, or a host starting with
 * `www.`; undefined for any other value, an IP address included.
 *
 * @param value the value
 * @returns the address parts
 * @example
 * webAddress('anna@mail.example.com')?.host; // 'mail.example.com'
 */
export function webAddress(value: string): WebAddress | undefined {
    const match = EMAIL.exec(value) ?? URL_WITH_SCHEME.exec(value) ?? WEB_HOST.exec(value);
    return match ? { prefix: match[1] ?? '', host: match[2] ?? '', suffix: match[3] ?? '' } : undefined;
}

/**
 * Whether a host name lies in a reserved domain.
 *
 * @param host the host name
 * @returns true for a reserved host
 * @example
 * isReservedHost('shop.example.org'); // true
 */
export function isReservedHost(host: string): boolean {
    const normalized = host.toLowerCase().replace(/\.$/u, '');
    const labels = normalized.split('.');
    return (
        RESERVED_TOP_LEVEL_DOMAINS.includes(labels[labels.length - 1] ?? '') ||
        RESERVED_SECOND_LEVEL_DOMAINS.some((domain) => normalized === domain || normalized.endsWith(`.${domain}`))
    );
}

/**
 * A value whose address lies in a reserved domain: an address with another host takes the documentation
 * domain, keeping `www.` and everything around the host. Any other value is returned as is.
 *
 * @param value the value
 * @returns the value with a reserved host
 * @example
 * withReservedHost('https://shop.acme.de/item/1'); // 'https://example.com/item/1'
 */
export function withReservedHost(value: string): string {
    const address = webAddress(value);
    if (!address || isReservedHost(address.host)) {
        return value;
    }
    const www = /^www\./iu.test(address.host) ? 'www.' : '';
    return `${address.prefix}${www}${DOCUMENTATION_DOMAIN}${address.suffix}`;
}

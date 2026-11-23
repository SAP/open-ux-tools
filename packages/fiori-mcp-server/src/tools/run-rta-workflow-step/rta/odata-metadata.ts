/**
 * Builds the `$metadata` URL for an OData data-source `uri` against the editor
 * `site` origin. Relative, leading-slash, and trailing-slash URIs all resolve
 * to `<site-origin>/<uri>$metadata`; a URI that already ends in `$metadata` is
 * left as-is (no duplication).
 *
 * Pins the host to the editor origin: an absolute or protocol-relative `uri`
 * that resolves to a foreign origin is rejected, so the authenticated browser
 * context can never be aimed at an off-origin host (SSRF guard).
 *
 * @param site Editor URL (localhost); only its origin is used.
 * @param uri OData data-source URI from the manifest (usually relative).
 * @returns Absolute `$metadata` URL on the site origin.
 * @throws Error when `uri` resolves to an origin other than the site origin.
 */
export function buildMetadataUrl(site: string, uri: string): string {
    const origin = new URL(site).origin;
    const resolved = new URL(uri, `${origin}/`);
    if (resolved.origin !== origin) {
        throw new Error(`Refusing to fetch OData metadata from a foreign origin: ${resolved.origin}`);
    }
    if (!resolved.pathname.endsWith('/$metadata')) {
        resolved.pathname = `${resolved.pathname.replace(/\/+$/, '')}/$metadata`;
    }
    return resolved.toString();
}

/** Matches the document root element `<Edmx>` / `<edmx:Edmx>` once prolog and comments are stripped. */
const EDMX_ROOT_RE = /^<(?:[A-Za-z_][\w.-]*:)?Edmx[\s/>]/;

/**
 * Reports whether `body`'s first element is `Edmx` (optionally namespace-prefixed). Leading
 * whitespace, a single `<?xml?>` declaration, and `<!-- -->` comments are skipped first, so a
 * nested or commented-out `Edmx` does not qualify. Prolog/comment skipping is a plain scan (no
 * nested regex quantifiers) to keep it linear and simple.
 *
 * @param body Raw response body.
 * @returns `true` when the document's root element is `Edmx`.
 */
export function looksLikeEdmx(body: string): boolean {
    let rest = body.replace(/^\s+/, '');
    let changed = true;
    while (changed) {
        changed = false;
        if (rest.startsWith('<?')) {
            const end = rest.indexOf('?>');
            if (end === -1) {
                return false;
            }
            rest = rest.slice(end + 2).replace(/^\s+/, '');
            changed = true;
        } else if (rest.startsWith('<!--')) {
            const end = rest.indexOf('-->');
            if (end === -1) {
                return false;
            }
            rest = rest.slice(end + 3).replace(/^\s+/, '');
            changed = true;
        }
    }
    return EDMX_ROOT_RE.test(rest);
}

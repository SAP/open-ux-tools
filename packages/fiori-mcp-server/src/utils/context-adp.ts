import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/** Formatted metadata returned inline, or a reference to the file it was spilled to. */
export type PersistedMetadata = { metadata: string } | { metadataFile: string; sizeBytes: number };

/**
 * Maximum formatted-EDMX length (characters) returned inline in a tool/step result.
 * Larger metadata is written to disk instead, so a multi-megabyte service document
 * cannot overflow the model's token budget.
 */
export const INLINE_METADATA_MAX_CHARS = 100_000;
/** Matches runs of characters that are not filesystem-safe. */
const UNSAFE_CHARS = /[^a-zA-Z0-9]+/g;
/** Matches leading or trailing underscores left after sanitisation. */
const EDGE_UNDERSCORES = /^_+|_+$/g;

/**
 * Writes formatted OData metadata to `<appPath>/.context/<name>-metadata.xml`
 * so agents can read it as context without fetching it on every invocation (and
 * so large metadata that cannot fit in a tool response can be read from disk).
 *
 * @param appPath Adaptation project root directory.
 * @param name File basename (e.g. a data source name or a sanitised service URI).
 * @param metadata Formatted XML content to persist.
 * @returns The absolute path the metadata was written to.
 */
export function writeContextMetadata(appPath: string, name: string, metadata: string): string {
    const metadataPath = join(appPath, '.context', `${name}-metadata.xml`);
    mkdirSync(dirname(metadataPath), { recursive: true });
    writeFileSync(metadataPath, metadata, 'utf-8');
    return metadataPath;
}

/**
 * Derives a filesystem-safe base name from an OData URI, so two URIs map to
 * distinct files and no path separator or special character can escape the
 * target directory. The readable part is the last few path segments (the
 * identifying tail of the service), and a truncated SHA-256 of the full URI keeps
 * names unique even when those tails collide (e.g. `/api/a-b/` vs `/api/a_b/`).
 * Using only the tail also bounds the name, so a long URI cannot cause `ENAMETOOLONG`.
 *
 * @param uri OData data-source URI.
 * @returns A sanitised base name (trailing segments) with a truncated SHA-256 hash of the original URI.
 */
function safeName(uri: string): string {
    const tailSegments = uri.split(/[/\\]/).filter(Boolean).slice(-3).join('_');
    const tail = tailSegments.replace(UNSAFE_CHARS, '_').replace(EDGE_UNDERSCORES, '') || 'service';
    const hash = createHash('sha256').update(uri).digest('hex').slice(0, 8);
    return `${tail}_${hash}`;
}

/**
 * Decides whether formatted metadata fits inline or must be spilled to disk, keyed
 * by its OData URI. Metadata under {@link INLINE_METADATA_MAX_CHARS} is returned
 * inline; larger metadata is written to `<appPath>/.context/<safe-uri>-metadata.xml`
 * and returned as a `{ metadataFile, sizeBytes }` reference.
 *
 * @param appPath Adaptation project root directory.
 * @param uri OData data-source URI (the stable, unique key for the metadata).
 * @param formatted Formatted XML content.
 * @returns Inline `metadata`, or a `metadataFile` reference when spilled.
 */
export function persistMetadata(appPath: string, uri: string, formatted: string): PersistedMetadata {
    if (formatted.length < INLINE_METADATA_MAX_CHARS) {
        return { metadata: formatted };
    }
    const metadataFile = writeContextMetadata(appPath, safeName(uri), formatted);
    return { metadataFile, sizeBytes: Buffer.byteLength(formatted) };
}

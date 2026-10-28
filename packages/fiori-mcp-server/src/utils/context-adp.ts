import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

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

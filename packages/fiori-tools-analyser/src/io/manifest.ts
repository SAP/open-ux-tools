import { join } from 'node:path';
import { promises as fs } from 'node:fs';
import type { Logger } from '@sap-ux/logger';
import type { AnalyseAppOptions } from '../types';
import type { ManifestDocument } from '../types/resources';

/**
 * Load the manifest.json file for the given Fiori application.
 *
 * @param options - analyser options containing the application path
 * @param logger - optional logger for diagnostic output
 * @returns the manifest document or undefined when not found/parsable
 */
export async function loadManifestDocument(
    options: AnalyseAppOptions,
    logger?: Logger
): Promise<ManifestDocument | undefined> {
    const manifestPath = join(options.appPath, 'webapp', 'manifest.json');
    try {
        const manifestContent = await fs.readFile(manifestPath, 'utf8');
        return {
            path: manifestPath,
            content: JSON.parse(manifestContent) as Record<string, unknown>
        };
    } catch (error: unknown) {
        logger?.debug('Unable to load manifest.json', error);
        return undefined;
    }
}

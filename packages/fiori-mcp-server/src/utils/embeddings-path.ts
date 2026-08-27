import fs from 'node:fs/promises';
import path from 'node:path';
import { getDataPath } from '@sap-ux/fiori-docs-embeddings';
import { logger } from './logger.js';

/**
 * Resolves the path to embeddings data bundled with the package.
 *
 * @returns Object containing paths and availability status
 */
export async function resolveEmbeddingsPath(): Promise<{
    dataPath: string;
    embeddingsPath: string;
    searchPath: string;
    docsPath: string;
    isExternalPackage: boolean;
    isAvailable: boolean;
}> {
    const dataPath = getDataPath();

    try {
        await fs.access(dataPath);
        logger.log('✓ Using @sap-ux/fiori-docs-embeddings package');

        return {
            dataPath,
            embeddingsPath: path.join(dataPath, 'embeddings'),
            searchPath: path.join(dataPath, 'search'),
            docsPath: path.join(dataPath, 'docs'),
            isExternalPackage: true,
            isAvailable: true
        };
    } catch {
        logger.warn('⚠️ No embeddings data available - running in limited mode');

        return {
            dataPath,
            embeddingsPath: path.join(dataPath, 'embeddings'),
            searchPath: path.join(dataPath, 'search'),
            docsPath: path.join(dataPath, 'docs'),
            isExternalPackage: false,
            isAvailable: false
        };
    }
}

/**
 * Check if embeddings data is available.
 *
 * @returns True if embeddings data is available
 */
export async function hasEmbeddingsData(): Promise<boolean> {
    const { isAvailable } = await resolveEmbeddingsPath();
    return isAvailable;
}

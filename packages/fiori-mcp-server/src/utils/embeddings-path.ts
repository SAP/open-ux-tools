/**
 * Utility module for resolving embeddings data paths
 * When bundled, data is copied to dist/data directory
 */

import path from 'node:path';
import { existsSync } from 'node:fs';
import { logger } from './logger';

/**
 * Resolves the path to embeddings data.
 * Looks for data in the bundled dist/data directory.
 *
 * @returns Object containing paths and availability status
 */
export async function resolveEmbeddingsPath(): Promise<{
    dataPath: string;
    embeddingsPath: string;
    isExternalPackage: boolean;
    isAvailable: boolean;
}> {
    // Data is bundled in dist/data (same directory as this bundle)
    const bundledDataPath = path.join(__dirname, 'data');
    const bundledEmbeddingsPath = path.join(bundledDataPath, 'embeddings');

    if (existsSync(bundledEmbeddingsPath)) {
        logger.log('✓ Using bundled embeddings data');
        return {
            dataPath: bundledDataPath,
            embeddingsPath: bundledEmbeddingsPath,
            isExternalPackage: false,
            isAvailable: true
        };
    }

    // Fallback: try to load from installed package (for development)
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports -- External package loaded at runtime
        const embeddingsModule = require('@sap-ux/fiori-docs-embeddings');
        const getDataPath = embeddingsModule.getDataPath;
        const getEmbeddingsPath = embeddingsModule.getEmbeddingsPath;

        if (typeof getDataPath === 'function' && typeof getEmbeddingsPath === 'function') {
            const packageDataPath = getDataPath();
            const packageEmbeddingsPath = getEmbeddingsPath();

            if (existsSync(packageEmbeddingsPath)) {
                logger.log('✓ Using embeddings package');
                return {
                    dataPath: packageDataPath ?? '',
                    embeddingsPath: packageEmbeddingsPath ?? '',
                    isExternalPackage: true,
                    isAvailable: true
                };
            }
        }
    } catch {
        // Package not available, continue to fallback
    }

    // No data available
    logger.warn('⚠️ No embeddings data available - running in limited mode');

    return {
        dataPath: bundledDataPath,
        embeddingsPath: bundledEmbeddingsPath,
        isExternalPackage: false,
        isAvailable: false
    };
}

/**
 * Utility module for resolving embeddings data paths
 * Handles fallback mechanisms when embeddings package is not available
 */

import path from 'node:path';
import { logger } from './logger';

/**
 * Attempts to resolve the path to embeddings data.
 * First tries to use embeddings package, then falls back to local data.
 *
 * @returns Object containing paths and availability status
 */
export async function resolveEmbeddingsPath(): Promise<{
    dataPath: string;
    embeddingsPath: string;
    isExternalPackage: boolean;
    isAvailable: boolean;
}> {
    // Try to resolve embeddings package using dynamic import (ESM package)
    try {
        // eslint-disable-next-line import/no-unresolved -- Dynamic import of ESM package
        const embeddingsModule = await import('@sap-ux/fiori-docs-embeddings');
        const getDataPath = embeddingsModule.getDataPath;
        const getEmbeddingsPath = embeddingsModule.getEmbeddingsPath;

        if (typeof getDataPath !== 'function' || typeof getEmbeddingsPath !== 'function') {
            throw new Error('Package not found or invalid');
        }

        const packageDataPath = getDataPath();
        const packageEmbeddingsPath = getEmbeddingsPath();

        logger.log('✓ Using embeddings package');

        return {
            dataPath: packageDataPath ?? '',
            embeddingsPath: packageEmbeddingsPath ?? '',
            isExternalPackage: true,
            isAvailable: true
        };
    } catch (error) {
        logger.warn(`Could not load embeddings package: ${error instanceof Error ? error.message : String(error)}`);
    }

    // No data available - return non-existent paths but mark as unavailable
    const fallbackPath = path.join(__dirname, '../../data');
    logger.warn('⚠️ No embeddings data available - running in limited mode');

    return {
        dataPath: fallbackPath,
        embeddingsPath: path.join(fallbackPath, 'embeddings'),
        isExternalPackage: false,
        isAvailable: false
    };
}

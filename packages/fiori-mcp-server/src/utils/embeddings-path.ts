/**
 * Utility module for resolving embeddings data paths
 * Handles fallback mechanisms when @sap-ux/fiori-docs-embeddings package is not available
 */

import fs from 'fs/promises';
import path from 'path';
import { logger } from './logger';

/**
 * Attempts to resolve the path to embeddings data. First tries to use @sap-ux/fiori-docs-embeddings package, then falls back to local data.
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
    // Try to resolve @sap-ux/fiori-docs-embeddings package
    try {
        // Try to require the embeddings package dynamically
        let embeddingsPackage: any;
        try {
            // eslint-disable-next-line  import/no-extraneous-dependencies,@typescript-eslint/no-unsafe-assignment
            embeddingsPackage = require('@sap-ux/fiori-docs-embeddings');
        } catch {
            // Try dynamic import as fallback with proper error handling
            try {
                const moduleName = '@sap-ux/fiori-docs-embeddings';
                embeddingsPackage = await import(moduleName);
            } catch {
                embeddingsPackage = null;
            }
        }

        if (!embeddingsPackage || typeof embeddingsPackage.getDataPath !== 'function') {
            throw new Error('Package not found or invalid');
        }

        const packageDataPath = embeddingsPackage.getDataPath();

        // Verify the data actually exists
        await fs.access(packageDataPath);

        logger.log('✓ Using @sap-ux/fiori-docs-embeddings package');

        return {
            dataPath: packageDataPath,
            embeddingsPath: path.join(packageDataPath, 'embeddings'),
            searchPath: path.join(packageDataPath, 'search'),
            docsPath: path.join(packageDataPath, 'docs'),
            isExternalPackage: true,
            isAvailable: true
        };
    } catch {
        logger.warn('Could not load @sap-ux/fiori-docs-embeddings package, trying local data...');
    }

    // Fallback to local data directory (legacy path)
    const localDataPath = path.join(__dirname, '../../data');
    try {
        await fs.access(localDataPath);
        logger.log('✓ Using local data directory');

        return {
            dataPath: localDataPath,
            embeddingsPath: path.join(localDataPath, 'embeddings'),
            searchPath: path.join(localDataPath, 'search'),
            docsPath: path.join(localDataPath, 'docs'),
            isExternalPackage: false,
            isAvailable: true
        };
    } catch {
        logger.warn('Local data directory not available either');
    }

    // No data available - return non-existent paths but mark as unavailable
    const fallbackPath = path.join(__dirname, '../../data');
    logger.warn('⚠️ No embeddings data available - running in limited mode');

    return {
        dataPath: fallbackPath,
        embeddingsPath: path.join(fallbackPath, 'embeddings'),
        searchPath: path.join(fallbackPath, 'search'),
        docsPath: path.join(fallbackPath, 'docs'),
        isExternalPackage: false,
        isAvailable: false
    };
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

/**
 * @sap-ux/fiori-docs-embeddings main entry point
 * Provides access to SAP Fiori documentation embeddings and related data
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get the path to the data directory
 * @returns {string} Absolute path to data directory
 */
export function getDataPath() {
    return join(__dirname, 'data');
}

/**
 * Get the path to the embeddings directory
 * @returns {string} Absolute path to embeddings directory
 */
export function getEmbeddingsPath() {
    return join(__dirname, 'data', 'embeddings');
}

/**
 * Get the path to the search data directory
 * @returns {string} Absolute path to search directory
 */
export function getSearchPath() {
    return join(__dirname, 'data', 'search');
}

/**
 * Get the path to the documentation data directory
 * @returns {string} Absolute path to docs directory
 */
export function getDocsPath() {
    return join(__dirname, 'data', 'docs');
}

/**
 * Check if embeddings data is available
 * @returns {Promise<boolean>} True if embeddings are available
 */
export async function hasEmbeddings() {
    try {
        const fs = await import('fs/promises');
        const embeddingsPath = getEmbeddingsPath();
        const stat = await fs.stat(embeddingsPath);
        return stat.isDirectory();
    } catch {
        return false;
    }
}

export { getDataPath as default };
/**
 * @sap-ux/fiori-docs-embeddings main entry point
 * Provides access to SAP Fiori documentation embeddings and related data
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { stat } from 'fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function getDataPath() {
    return path.join(__dirname, 'data');
}

export function getEmbeddingsPath() {
    return path.join(__dirname, 'data', 'embeddings');
}

export function getSearchPath() {
    return path.join(__dirname, 'data', 'search');
}

export function getDocsPath() {
    return path.join(__dirname, 'data', 'docs');
}

export async function hasEmbeddings() {
    try {
        const embeddingsPath = getEmbeddingsPath();
        const s = await stat(embeddingsPath);
        return s.isDirectory();
    } catch {
        return false;
    }
}

export default getDataPath;

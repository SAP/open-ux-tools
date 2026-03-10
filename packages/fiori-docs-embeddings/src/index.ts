/**
 * @sap-ux/fiori-docs-embeddings main entry point
 * Provides access to SAP Fiori documentation embeddings and related data
 */

import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

// ES module - use import.meta.url to get the directory path
const currentFilename = fileURLToPath(import.meta.url);
const packageRootDirname = path.dirname(path.dirname(currentFilename));

/**
 * Get the path to the data directory.
 *
 * @returns Absolute path to data directory
 */
export function getDataPath(): string {
    return path.join(packageRootDirname, 'data');
}

/**
 * Get the path to the embeddings directory.
 *
 * @returns Absolute path to embeddings directory
 */
export function getEmbeddingsPath(): string {
    return path.join(packageRootDirname, 'data', 'embeddings');
}
export interface EmbeddingsId {
    id: string;
    path: string;
    weighting: number;
}
export const embeddingsIds: EmbeddingsId[] = [{ id: 'fiori-embeddings', path: getEmbeddingsPath(), weighting: 1 }];

export default getDataPath;

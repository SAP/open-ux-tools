/**
 * @sap-ux/fiori-docs-embeddings main entry point
 * Provides access to SAP Fiori documentation embeddings and related data
 */

import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

// Handle both CommonJS and ES module environments
let currentFilename: string;
let packageRootDirname: string;

if (typeof import.meta !== 'undefined') {
    // ES module environment
    currentFilename = fileURLToPath(import.meta.url);
    packageRootDirname = path.dirname(currentFilename);
} else {
    // CommonJS environment
    currentFilename = __filename;
    packageRootDirname = __dirname;
}
packageRootDirname = path.join(packageRootDirname, '..');

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

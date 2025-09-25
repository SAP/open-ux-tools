/**
 * Data directory access point for @sap-ux/fiori-docs-embeddings
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Export the current directory path (data directory)
 */
export default __dirname;

/**
 * Get the absolute path to this data directory
 * @returns {string} Absolute path to data directory
 */
export function getPath() {
    return __dirname;
}
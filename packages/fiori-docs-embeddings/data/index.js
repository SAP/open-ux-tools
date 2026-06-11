/**
 * Data directory access point for @sap-ux/fiori-docs-embeddings
 */


const __dirname = import.meta.dirname;

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
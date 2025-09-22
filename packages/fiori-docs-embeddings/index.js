/**
 * @sap-ux/fiori-docs-embeddings main entry point
 * Provides access to SAP Fiori documentation embeddings and related data
 */

const path = require('path');

/**
 * Get the path to the data directory
 * @returns {string} Absolute path to data directory
 */
function getDataPath() {
    return path.join(__dirname, 'data');
}

/**
 * Get the path to the embeddings directory
 * @returns {string} Absolute path to embeddings directory
 */
function getEmbeddingsPath() {
    return path.join(__dirname, 'data', 'embeddings');
}

/**
 * Get the path to the search data directory
 * @returns {string} Absolute path to search directory
 */
function getSearchPath() {
    return path.join(__dirname, 'data', 'search');
}

/**
 * Get the path to the documentation data directory
 * @returns {string} Absolute path to docs directory
 */
function getDocsPath() {
    return path.join(__dirname, 'data', 'docs');
}

/**
 * Check if embeddings data is available
 * @returns {Promise<boolean>} True if embeddings are available
 */
async function hasEmbeddings() {
    try {
        const fs = require('fs/promises');
        const embeddingsPath = getEmbeddingsPath();
        const stat = await fs.stat(embeddingsPath);
        return stat.isDirectory();
    } catch {
        return false;
    }
}

module.exports = {
    getDataPath,
    getEmbeddingsPath,
    getSearchPath,
    getDocsPath,
    hasEmbeddings
};

module.exports.default = getDataPath;
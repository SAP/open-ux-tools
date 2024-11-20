const path = require('path');
const { existsSync, readFileSync, writeFileSync, realpathSync } = require('fs');

const rootDirectory = realpathSync(process.cwd());
const metadataDirectory = 'reports';

const getTestMetadataFilePath = function () {
    const fileName = 'test-metadata-' + process.env.JEST_WORKER_ID + '.json';
    return path.join(rootDirectory, metadataDirectory, fileName);
};

/**
 * Store metadata for a test.
 * @param {string} testName The name of the test.
 * @param {Array} params The metadata for the test to store.
 */
const storeTestMetadata = function (testName, params) {
    if (existsSync(metadataDirectory)) {
        let metadata = {};
        if (existsSync(getTestMetadataFilePath())) {
            metadata = JSON.parse(readFileSync(getTestMetadataFilePath()));
        }
        metadata[testName] = params;
        writeFileSync(getTestMetadataFilePath(), JSON.stringify(metadata, null, 4), 'utf-8');
    }
};

/**
 * Get the metadata for a test.
 * @param {string} testName  The name of the test.
 * @returns {*|*[]} The metadata for the test.
 */
const getTestMetadata = function (testName) {
    let metadata = {};
    if (existsSync(metadataDirectory)) {
        if (existsSync(getTestMetadataFilePath())) {
            metadata = JSON.parse(readFileSync(getTestMetadataFilePath()));
        }
    }
    return metadata[testName] || {};
};

module.exports = { storeTestMetadata, getTestMetadata };

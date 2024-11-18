const path = require('path');
const { existsSync, readFileSync, writeFileSync, realpathSync } = require('fs');

const rootDirectory = realpathSync(process.cwd());
const metadataDirectory = 'reports';

const getTestMetadataFilePath = function () {
    const fileName = 'test-metadata-' + process.env.JEST_WORKER_ID + '.json';
    return path.join(rootDirectory, metadataDirectory, fileName);
};

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

const getTestMetadata = function (testName) {
    let metadata = {};
    if (existsSync(metadataDirectory)) {
        if (existsSync(getTestMetadataFilePath())) {
            metadata = JSON.parse(readFileSync(getTestMetadataFilePath()));
        }
    }
    return metadata[testName] || [];
};

module.exports = { storeTestMetadata, getTestMetadata };

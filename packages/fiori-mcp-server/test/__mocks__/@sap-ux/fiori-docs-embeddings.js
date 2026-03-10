// Mock implementation of @sap-ux/fiori-docs-embeddings
const path = require('path');

const getDataPath = jest.fn(() => path.join(__dirname, 'mock-data'));
const getEmbeddingsPath = jest.fn(() => path.join(__dirname, 'mock-data', 'embeddings'));

const embeddingsIds = [
    {
        id: 'fiori-embeddings',
        path: getEmbeddingsPath(),
        weighting: 1
    }
];

module.exports = {
    getDataPath,
    getEmbeddingsPath,
    embeddingsIds,
    __esModule: true,
    default: getDataPath
};

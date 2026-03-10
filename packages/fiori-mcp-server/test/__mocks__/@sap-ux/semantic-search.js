// Mock implementation of @sap-ux/semantic-search (replaces @xenova/transformers and @lancedb/lancedb)
const createMockPipelineInstance = () => jest.fn().mockResolvedValue({
    data: new Float32Array(384).fill(0).map(() => Math.random() - 0.5) // MiniLM-L6-v2 dimensions
});

const createEmbeddingPipeline = jest.fn(() => Promise.resolve(createMockPipelineInstance()));

// LanceDB functionality
const mockTable = {
    vectorSearch: jest.fn().mockImplementation(() => ({
        limit: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([
            {
                id: 'test-doc-1',
                title: 'Test Document 1',
                category: 'test',
                path: 'test/doc1.md',
                content: 'Test content for document 1',
                tags: ['test', 'mock'],
                headers: ['Test Header'],
                excerpt: 'Test excerpt',
                _distance: 0.1
            }
        ])
    })),
    search: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    toArray: jest.fn().mockResolvedValue([])
};

const mockConnection = {
    openTable: jest.fn().mockResolvedValue(mockTable),
    tableNames: jest.fn().mockResolvedValue(['documents'])
};

const connect = jest.fn().mockResolvedValue(mockConnection);

module.exports = {
    createEmbeddingPipeline,
    connect,
    __esModule: true,
    default: {
        createEmbeddingPipeline,
        connect
    }
};
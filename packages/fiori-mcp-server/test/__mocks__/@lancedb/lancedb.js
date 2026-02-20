// Mock for @lancedb/lancedb

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
    connect,
    __esModule: true,
    default: {
        connect
    }
};
const store = jest.requireActual('@sap-ux/store');

const mockedService = {
    read: jest.fn().mockReturnValue(undefined),
    write: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(true),
    getAll: jest.fn().mockResolvedValue([]),
    partialUpdate: jest.fn().mockResolvedValue(undefined)
};

module.exports = {
    ...store,
    mockedService,
    getService: jest.fn().mockResolvedValue(mockedService)
};

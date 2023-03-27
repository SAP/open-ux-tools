const mockService = {
    read: jest.fn().mockReturnValue({})
};

module.exports = {
    getService: jest.fn().mockResolvedValue(mockService),
    BackendSystemKey: jest.fn()
};

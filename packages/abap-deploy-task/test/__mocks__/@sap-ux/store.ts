const store = jest.requireActual('@sap-ux/store');

const mockedService = { 
    read: jest.fn().mockReturnValue({}) 
};

module.exports = {
    ...store,
    mockedService,
    getService: jest.fn().mockResolvedValue(mockedService)
};



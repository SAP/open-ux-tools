const axiosExt = jest.requireActual('@sap-ux/axios-extension');

const mockedUi5AbapRepositoryService = {
    deploy: jest.fn(),
    undeploy: jest.fn()
};

const mockedProvider = {
    getUi5AbapRepository: () => mockedUi5AbapRepositoryService
};

module.exports = {
    ...axiosExt,
    mockedUi5AbapRepositoryService,
    createForAbap: jest.fn().mockReturnValue(mockedProvider)
};

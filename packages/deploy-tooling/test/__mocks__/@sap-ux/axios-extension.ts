const axiosExt = jest.requireActual('@sap-ux/axios-extension');

const mockedUi5AbapRepositoryService = {
    defaults: {},
    deploy: jest.fn(),
    undeploy: jest.fn()
};

const mockedProvider = {
    getUi5AbapRepository: jest.fn().mockReturnValue(mockedUi5AbapRepositoryService)
};

module.exports = {
    ...axiosExt,
    mockedUi5AbapRepositoryService,
    mockedProvider,
    createForAbap: jest.fn().mockReturnValue(mockedProvider),
    createForAbapOnCloud: jest.fn((options: unknown) => {
        const provider = axiosExt.createForAbapOnCloud(options);
        provider.getUi5AbapRepository = mockedProvider.getUi5AbapRepository;
        return provider;
    }),
    createForDestination: jest.fn().mockReturnValue(mockedProvider)
};

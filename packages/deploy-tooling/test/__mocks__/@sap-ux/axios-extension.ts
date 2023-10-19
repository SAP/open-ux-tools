const axiosExt = jest.requireActual('@sap-ux/axios-extension');

const mockedAdtServiceMethod = {
    createTransportRequest: jest.fn(),
    listPackages: jest.fn().mockResolvedValue([]),
    getTransportRequests: jest.fn(),
    getAtoInfo: jest.fn()
};

const mockedUi5AbapRepositoryService = {
    defaults: {},
    deploy: jest.fn(),
    undeploy: jest.fn()
};

const mockedProvider = {
    getUi5AbapRepository: jest.fn().mockReturnValue(mockedUi5AbapRepositoryService),
    getAdtService: jest.fn().mockReturnValue(mockedAdtServiceMethod)
};

module.exports = {
    ...axiosExt,
    mockedUi5AbapRepositoryService,
    mockedAdtServiceMethod,
    mockedProvider,
    createForAbap: jest.fn().mockReturnValue(mockedProvider),
    createForAbapOnCloud: jest.fn((options: unknown) => {
        const provider = axiosExt.createForAbapOnCloud(options);
        provider.getUi5AbapRepository = mockedProvider.getUi5AbapRepository;
        return provider;
    }),
    createForDestination: jest.fn().mockReturnValue(mockedProvider)
};

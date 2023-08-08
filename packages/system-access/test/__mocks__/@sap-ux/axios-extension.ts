const axiosExt = jest.requireActual('@sap-ux/axios-extension');

const mockedProvider = {};

module.exports = {
    ...axiosExt,
    mockedProvider,
    createForAbap: jest.fn().mockReturnValue(mockedProvider),
    createForAbapOnCloud: jest.fn((options: unknown) => {
        const provider = axiosExt.createForAbapOnCloud(options);
        return provider;
    }),
    createForDestination: jest.fn().mockReturnValue(mockedProvider)
};

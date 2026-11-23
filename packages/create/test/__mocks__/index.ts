import mockedStore from './@sap-ux/store.js';

type MockedStore = {
    mockedService: {
        read: jest.Mock;
    };
};

export const mockedStoreService = (mockedStore as unknown as MockedStore).mockedService;

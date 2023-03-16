import mockedAxiosExtension from '@sap-ux/axios-extension';
import { isAppStudio, listDestinations } from '@sap-ux/btp-utils';
import mockedStore from '@sap-ux/store';

type MockedStore = {
    mockedService: {
        read: jest.Mock;
    };
};

export const mockedStoreService = (mockedStore as unknown as MockedStore).mockedService;

type MockedAxiosExtension = {
    mockedUi5AbapRepositoryService: {
        deploy: jest.Mock;
        undeploy: jest.Mock;
    };
};
export const mockedUi5RepoService = (mockedAxiosExtension as unknown as MockedAxiosExtension)
    .mockedUi5AbapRepositoryService;

export const mockIsAppStudio = isAppStudio as jest.Mock;

export const mockListDestinations = listDestinations as jest.Mock;

export const mockCreateForAbap = mockedAxiosExtension.createForAbap as jest.Mock;

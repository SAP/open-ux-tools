import mockedStore from '@sap-ux/store';
import { getCredentialsForDestinationService, isAppStudio, listDestinations } from '@sap-ux/btp-utils';
import fs from 'fs';

export const mockReadFileSync = jest.spyOn(fs, 'readFileSync');

type MockedStore = {
    mockedService: {
        read: jest.Mock;
        write: jest.Mock;
    };
};

export const mockedStoreService = (mockedStore as unknown as MockedStore).mockedService;

export const mockIsAppStudio = isAppStudio as jest.Mock;

export const mockListDestinations = listDestinations as jest.Mock;

export const mockGetCredentialsForDestinationService = getCredentialsForDestinationService as jest.Mock;

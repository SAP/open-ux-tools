import mockedStore from '@sap-ux/store';
import mockedAxiosExtension from '@sap-ux/axios-extension';
import { isAppStudio, listDestinations } from '@sap-ux/btp-utils';
import fs from 'fs';

export const mockReadFileSync = jest.spyOn(fs, 'readFileSync');

type MockedStore = {
    mockedService: {
        read: jest.Mock;
    };
};

export const mockedStoreService = (mockedStore as unknown as MockedStore).mockedService;

type MockedAxiosExtension = {
    mockedProvider: { getUi5AbapRepository: jest.Mock; getAdtService: jest.Mock };
    mockedUi5AbapRepositoryService: {
        deploy: jest.Mock;
        undeploy: jest.Mock;
    };
    mockedAdtServiceMethod: {
        createTransportRequest: jest.Mock;
    };
};

export const mockedProvider = (mockedAxiosExtension as unknown as MockedAxiosExtension).mockedProvider;

export const mockIsAppStudio = isAppStudio as jest.Mock;

export const mockListDestinations = listDestinations as jest.Mock;

export const mockCreateForAbap = mockedAxiosExtension.createForAbap as jest.Mock;

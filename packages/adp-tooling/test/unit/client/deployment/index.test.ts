import type { AbapServiceProvider } from '@sap-ux/axios-extension';

import { listPackages, ABAP_PACKAGE_SEARCH_MAX_RESULTS, listTransports } from '../../../../src';

describe('ABAP Deployment', () => {
    const getAdtServiceMock = jest.fn();
    const provider = {
        getAdtService: getAdtServiceMock
    };

    beforeEach(() => {
        getAdtServiceMock.mockClear();
    });

    describe('listPackages', () => {
        it('should return an array of packages based on the provided search phrase', async () => {
            const mockPackageList = ['PKG1', 'PKG2'];
            const listPackageServiceInstance = {
                listPackages: jest.fn().mockResolvedValue(mockPackageList)
            };
            provider.getAdtService.mockResolvedValue(listPackageServiceInstance);

            const result = await listPackages('test', provider as unknown as AbapServiceProvider);

            expect(result).toEqual(mockPackageList);
            expect(listPackageServiceInstance.listPackages).toHaveBeenCalledWith({
                maxResults: ABAP_PACKAGE_SEARCH_MAX_RESULTS,
                phrase: 'test'
            });
        });

        it('should return an empty array if the service returns undefined', async () => {
            provider.getAdtService.mockResolvedValue({
                listPackages: jest.fn().mockResolvedValue(undefined)
            });

            const result = await listPackages('test', provider as unknown as AbapServiceProvider);

            expect(result).toEqual([]);
        });
    });

    describe('listTransports', () => {
        it('should return an array of transport request numbers for a given package and repository', async () => {
            const mockTransports = [{ transportNumber: 'TR1' }, { transportNumber: 'TR2' }];
            const transportServiceInstance = {
                getTransportRequests: jest.fn().mockResolvedValue(mockTransports)
            };
            provider.getAdtService.mockResolvedValue(transportServiceInstance);

            const result = await listTransports('PKG1', 'REPO1', provider as unknown as AbapServiceProvider);

            expect(result).toEqual(['TR1', 'TR2']);
            expect(transportServiceInstance.getTransportRequests).toHaveBeenCalledWith('PKG1', 'REPO1');
        });

        it('should return an empty array if the service fails to fetch transport requests', async () => {
            provider.getAdtService.mockResolvedValue({
                getTransportRequests: jest.fn().mockResolvedValue(undefined)
            });

            const result = await listTransports('PKG1', 'REPO1', provider as unknown as AbapServiceProvider);

            expect(result).toEqual([]);
        });
    });
});

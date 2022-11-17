import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import type { AxiosError } from 'axios';
import { Severity } from '../../../src/types';
import { checkCatalogServices } from '../../../src/checks/helpers';

describe('Catalog service tests, function checkCatalogServices()', () => {
    test('Returns v2 and v4 services succesfully', async () => {
        const v2catalogResponse = ['V2_S1', 'V2_S2', 'V2_S3'];
        const v4catalogResponse = ['V4_S1', 'V4_S2', 'V4_S3'];

        const catalog = jest.fn();
        const listServices = jest.fn();

        listServices.mockImplementationOnce(() => v2catalogResponse).mockImplementationOnce(() => v4catalogResponse);

        catalog.mockImplementation(() => {
            return {
                listServices: listServices
            };
        });

        const abapServiceProvider = {
            catalog: catalog
        } as unknown as AbapServiceProvider;

        // Test execution
        const catalogService = await checkCatalogServices(abapServiceProvider, 'system1');

        // Result check
        expect(catalogService.result.v2.results).toEqual(['V2_S1', 'V2_S2', 'V2_S3']);
        expect(catalogService.result.v4.results).toEqual(['V4_S1', 'V4_S2', 'V4_S3']);
        expect(catalogService.messages.length).toBe(2);
        expect(catalogService.messages[0].severity).toBe(Severity.Info);
        expect(catalogService.messages[1].severity).toBe(Severity.Info);
    });

    test('Fails with error (empty abapServiceProvider)', async () => {
        const abapServiceProvider = {} as unknown as AbapServiceProvider;

        // Test execution
        const catalogService = await checkCatalogServices(abapServiceProvider, 'system1');

        // Result check
        expect(catalogService.result.v2.results).toEqual(undefined);
        expect(catalogService.result.v4.results).toEqual(undefined);
        expect(catalogService.messages.length).toBe(4);
    });

    test('Returns v2 services only (v4 throws 401 error)', async () => {
        const v2catalogResponse = ['V2_S1', 'V2_S2', 'V2_S3'];

        const catalog = jest.fn();
        const listServices = jest.fn();

        listServices
            .mockImplementationOnce(() => v2catalogResponse)
            .mockImplementationOnce(() => {
                throw {
                    response: {
                        status: 401
                    },
                    config: {},
                    toJSON() {
                        return { config: this.config };
                    }
                } as AxiosError;
            });

        catalog.mockImplementation(() => {
            return {
                listServices: listServices
            };
        });

        const abapServiceProvider = {
            catalog: catalog
        } as unknown as AbapServiceProvider;

        // Test execution
        const catalogService = await checkCatalogServices(abapServiceProvider, 'system1');

        // Result check
        expect(catalogService.result.v2.results).toEqual(['V2_S1', 'V2_S2', 'V2_S3']);
        expect(catalogService.result.v4.results).toEqual(undefined);
        expect(catalogService.messages.length).toBe(3);
        expect(catalogService.messages[0].severity).toBe(Severity.Info);
        expect(catalogService.messages[1].severity).toBe(Severity.Error);
    });

    test('Test removing password from logged error (throws 403 error)', async () => {
        const catalog = jest.fn();
        const listServices = jest.fn();

        listServices
            .mockImplementationOnce(() => {
                throw {
                    response: {},
                    cause: {
                        status: 403
                    },
                    config: {
                        auth: {
                            password: 'mockPassword'
                        }
                    },
                    toJSON() {
                        return { config: this.config };
                    }
                };
            })
            .mockImplementationOnce(() => {
                throw {
                    cause: {},
                    config: { auth: {} },
                    toJSON() {
                        return { config: this.config };
                    }
                };
            });

        catalog.mockImplementation(() => {
            return {
                listServices: listServices
            };
        });

        const abapServiceProvider = {
            catalog: catalog
        } as unknown as AbapServiceProvider;

        // Test execution
        const catalogService = await checkCatalogServices(abapServiceProvider, 'system1');

        // Result check
        expect(catalogService.result.v2.results).toEqual(undefined);
        expect(catalogService.result.v4.results).toEqual(undefined);
        expect(catalogService.messages.length).toBe(4);
        // v2 response
        expect(catalogService.messages[0].severity).toBe(Severity.Error);
        expect(catalogService.messages[1].severity).toBe(Severity.Debug);
        expect(catalogService.messages[1].severity).toBe(Severity.Debug);
        expect(catalogService.messages[1].text).not.toContain('mockPassword');
    });
});

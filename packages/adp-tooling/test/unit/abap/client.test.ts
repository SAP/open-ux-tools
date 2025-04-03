import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import { AdtCatalogService, UI5RtVersionService } from '@sap-ux/axios-extension';

import { getFlexUISupportedSystem, getSystemUI5Version } from '../../../src';

describe('getFlexUISupportedSystem', () => {
    it('should return immediately when isCustomerBase is false', async () => {
        const provider = {
            get: jest.fn()
        } as unknown as AbapServiceProvider;

        const result = await getFlexUISupportedSystem(provider, false);

        expect(result).toEqual({ isOnPremise: true, isUIFlex: true });
    });

    it('should call provider.get and return correct flags based on response data when isCustomerBase is true', async () => {
        const fakeData =
            'Some text including dta_folder and http://www.sap.com/adt/categories/ui_flex and other details';
        const response = { data: fakeData };

        const provider = {
            get: jest.fn().mockResolvedValue(response)
        } as unknown as AbapServiceProvider;

        const result = await getFlexUISupportedSystem(provider, true);

        expect(provider.get).toHaveBeenCalledWith(AdtCatalogService.ADT_DISCOVERY_SERVICE_PATH, {
            headers: { Accept: 'application/*' }
        });
        expect(result).toEqual({
            isOnPremise: true,
            isUIFlex: true
        });
    });
});

describe('getSystemUI5Version', () => {
    it('should return the UI5 version from the service', async () => {
        const version = '1.135.0';
        const dummyService = {
            getUI5Version: jest.fn().mockResolvedValue(version)
        };
        const provider = {
            getAdtService: jest.fn().mockResolvedValue(dummyService)
        } as unknown as AbapServiceProvider;

        const result = await getSystemUI5Version(provider);

        expect(provider.getAdtService).toHaveBeenCalledWith(UI5RtVersionService);
        expect(dummyService.getUI5Version).toHaveBeenCalled();
        expect(result).toBe(version);
    });

    it('should return undefined if the service is not available', async () => {
        const provider = {
            getAdtService: jest.fn().mockResolvedValue(undefined)
        } as unknown as AbapServiceProvider;

        const result = await getSystemUI5Version(provider);

        expect(result).toBeUndefined();
    });
});

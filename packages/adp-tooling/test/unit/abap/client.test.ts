import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import { AdtCatalogService, UI5RtVersionService } from '@sap-ux/axios-extension';

import { getFlexUISupportedSystem, getSystemUI5Version, getBaseAppInbounds } from '../../../src';

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

describe('getBaseAppInbounds', () => {
    it('should return inbounds for the given appId', async () => {
        const appId = 'testApp';
        const inbounds = [
            {
                content: {
                    semanticObject: 'semanticObject',
                    action: 'action',
                    hideLauncher: false,
                    icon: 'sap-icon://task',
                    title: 'Title',
                    subTitle: 'Subtitle'
                }
            }
        ];
        const lrepService = {
            getSystemInfo: jest.fn().mockResolvedValue({ inbounds })
        };
        const provider = {
            getLayeredRepository: jest.fn().mockReturnValue(lrepService)
        } as unknown as AbapServiceProvider;

        const result = await getBaseAppInbounds(appId, provider);

        expect(provider.getLayeredRepository).toHaveBeenCalled();
        expect(lrepService.getSystemInfo).toHaveBeenCalledWith(undefined, undefined, appId);
        expect(result).toEqual({
            'semanticObject-action': {
                'action': 'action',
                'hideLauncher': false,
                'icon': 'sap-icon://task',
                'semanticObject': 'semanticObject',
                'subTitle': 'Subtitle',
                'title': 'Title'
            }
        });
    });

    it('should return undefined if no inbounds are found', async () => {
        const appId = 'testApp';
        const lrepService = {
            getSystemInfo: jest.fn().mockResolvedValue({ inbounds: [] })
        };
        const provider = {
            getLayeredRepository: jest.fn().mockReturnValue(lrepService)
        } as unknown as AbapServiceProvider;

        const result = await getBaseAppInbounds(appId, provider);

        expect(provider.getLayeredRepository).toHaveBeenCalled();
        expect(lrepService.getSystemInfo).toHaveBeenCalledWith(undefined, undefined, appId);
        expect(result).toBeUndefined();
    });

    it('should filter out inbounds with hideLauncher=true', async () => {
        const appId = 'testApp';
        const inbounds = [
            {
                content: {
                    semanticObject: 'semanticObject',
                    action: 'action',
                    hideLauncher: false,
                    icon: 'sap-icon://task',
                    title: 'Title',
                    subTitle: 'Subtitle'
                }
            },
            {
                content: {
                    semanticObject: 'semanticObject1',
                    action: 'action1',
                    hideLauncher: true,
                    icon: 'sap-icon://task',
                    title: 'Title1',
                    subTitle: 'Subtitle1'
                }
            }
        ];
        const lrepService = {
            getSystemInfo: jest.fn().mockResolvedValue({ inbounds })
        };
        const provider = {
            getLayeredRepository: jest.fn().mockReturnValue(lrepService)
        } as unknown as AbapServiceProvider;

        const result = await getBaseAppInbounds(appId, provider);

        expect(provider.getLayeredRepository).toHaveBeenCalled();
        expect(lrepService.getSystemInfo).toHaveBeenCalledWith(undefined, undefined, appId);
        expect(result).toEqual({
            'semanticObject-action': {
                'action': 'action',
                'hideLauncher': false,
                'icon': 'sap-icon://task',
                'semanticObject': 'semanticObject',
                'subTitle': 'Subtitle',
                'title': 'Title'
            }
        });
    });
});

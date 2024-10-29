import { getAppComponent, getApplicationType, getPageName, getReference, getV4PageType } from '../../../src/utils/application';
import ComponentMock from 'mock/sap/ui/core/Component';

describe('getApplicationType - fev2', () => {
    const manifestMockListreportApp = {
        ['sap.ui.generic.app']: {
            pages: [
                {
                    entitySet: 'Products'
                }
            ]
        }
    } as any;

    const manifestMockOVPApp = {
        ['sap.ovp']: {
            pages: [
                {
                    entitySet: 'Products'
                }
            ]
        }
    } as any;
    test('fev2 - lrp app', () => {
        expect(getApplicationType(manifestMockListreportApp)).toBe('fe-v2');
    });
    test('fev2 - ovp app', () => {
        expect(getApplicationType(manifestMockOVPApp)).toBe('fe-v2');
    });
});

describe('getApplicationType - fev4', () => {
    const manifestMockListreportApp = {
        ['sap.ui5']: {
            routing: {
                targets: {
                    'ListReport|Products': {
                        name: 'sap.fe.templates.ListReport',
                        settings: {}
                    }
                }
            }
        }
    } as any;

    test('fev4 - lrp app', () => {
        expect(getApplicationType(manifestMockListreportApp)).toBe('fe-v4');
    });
});

describe('getApplicationType - freestyle', () => {
    const manifestMockListreportApp = {} as any;

    test('freestyle app', () => {
        expect(getApplicationType(manifestMockListreportApp)).toBe('freestyle');
    });
});

describe('utils/application', () => {
    const appComponent = { id: 'app-component-id', getManifest: jest.fn().mockReturnValue({
        'sap.app' :{
            id: 'test'
        }
    }) };
    ComponentMock.getOwnerComponentFor = jest.fn().mockReturnValue({
        isA: jest
            .fn()
            .mockReturnValueOnce(false)
            .mockReturnValueOnce(true)
            .mockReturnValueOnce(false)
            .mockReturnValueOnce(true)
            .mockReturnValueOnce(false)
            .mockReturnValue(true),
        getAppComponent: jest.fn().mockReturnValue(appComponent),
        getRootControl: jest.fn().mockReturnValue({
            getId: jest.fn().mockReturnValue('test::ObjectPage'),
            getViewName: jest
                .fn()
                .mockReturnValueOnce('sap.fe.templates.ObjectPage.ObjectPage')
                .mockReturnValue('sap.fe.templates.ListReport.ListReport')
        })
    });

    test('getAppComponent - undefined', () => {
        expect(getAppComponent({ id: 'buttonId' } as any)).toBe(undefined);
    });

    test('getAppComponent - defined', () => {
        expect(getAppComponent({ id: 'buttonId2' } as any)).toBe(appComponent);
    });

    test('getPageName - undefined', () => {
        expect(getPageName({ id: 'buttonId' } as any)).toBe(undefined);
    });

    test('getPageName - defined', () => {
        expect(getPageName({ id: 'buttonId2' } as any)).toBe('ObjectPage');
    });

    test('getV4PageType - undefined', () => {
        expect(getV4PageType({ id: 'buttonId' } as any)).toBe(undefined);
    });

    test('getV4PageType - ObjectPage', () => {
        expect(getV4PageType({ id: 'buttonId2' } as any)).toBe('ObjectPage');
    });

    test('getV4PageType - ListReport', () => {
        expect(getV4PageType({ id: 'buttonId3' } as any)).toBe('ListReport');
    });

    test('getReference', () => {
        expect(getReference({ id: 'buttonId' } as any)).toBe('test');
    });
});

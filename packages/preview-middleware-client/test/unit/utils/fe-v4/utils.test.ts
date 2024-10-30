import { getAppComponent, getReference, getV4PageType } from '../../../../src/utils/fe-v4/utils';
import ComponentMock from 'mock/sap/ui/core/Component';

describe('fe-v4/utils', () => {
    const appComponent = {
        id: 'app-component-id',
        getManifest: jest.fn().mockReturnValue({
            'sap.app': {
                id: 'test'
            }
        })
    };
    ComponentMock.getOwnerComponentFor = jest.fn().mockReturnValue({
        isA: jest
            .fn()
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

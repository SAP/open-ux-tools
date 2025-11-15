import ManagedObject from 'sap/ui/base/ManagedObject';
import { getV4AppComponent, getReference, getV4PageType } from '../../../../src/utils/fe-v4';
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

    function createMock(isTemplateComponent: boolean, rootControlId: string, rootViewName: string) {
        return jest.fn().mockReturnValue({
            isA: jest.fn().mockReturnValue(isTemplateComponent),
            getAppComponent: jest.fn().mockReturnValue(appComponent),
            getRootControl: jest.fn().mockReturnValue({
                isA: jest.fn().mockImplementation((type) => type === 'sap.ui.core.mvc.XMLView'),
                getId: jest.fn().mockReturnValue(rootControlId),
                getViewName: jest.fn().mockReturnValue(rootViewName)
            })
        });
    }

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('getAppComponent - undefined', () => {
        const isASpy = jest.fn().mockReturnValue(false);
        ComponentMock.getOwnerComponentFor = jest.fn().mockReturnValue({
            isA: isASpy
        });
        expect(getV4AppComponent({ id: 'buttonId' } as unknown as ManagedObject)).toBe(undefined);
        expect(isASpy).toHaveBeenCalledWith('sap.fe.core.TemplateComponent');
    });

    test('getAppComponent - defined', () => {
        ComponentMock.getOwnerComponentFor = createMock(
            true,
            'test::ObjectPage',
            'sap.fe.templates.ObjectPage.ObjectPage'
        );
        expect(getV4AppComponent({ id: 'buttonId2' } as unknown as ManagedObject)).toBe(appComponent);
    });

    test('getV4PageType - undefined', () => {
        const isASpy = jest.fn().mockReturnValue(false);
        ComponentMock.getOwnerComponentFor = jest.fn().mockReturnValue({
            isA: isASpy
        });
        expect(getV4PageType({ id: 'buttonId' } as unknown as ManagedObject)).toBe(undefined);
        expect(isASpy).toHaveBeenCalledWith('sap.fe.core.TemplateComponent');
    });

    test('getV4PageType - ObjectPage', () => {
        ComponentMock.getOwnerComponentFor = createMock(
            true,
            'test::ObjectPage',
            'sap.fe.templates.ObjectPage.ObjectPage'
        );
        expect(getV4PageType({ id: 'buttonId2' } as unknown as ManagedObject)).toBe('ObjectPage');
    });

    test('getV4PageType - ListReport', () => {
        ComponentMock.getOwnerComponentFor = createMock(
            true,
            'test::ListReport',
            'sap.fe.templates.ListReport.ListReport'
        );
        expect(getV4PageType({ id: 'buttonId3' } as unknown as ManagedObject)).toBe('ListReport');
    });

    test('getReference', () => {
        expect(getReference({ id: 'buttonId' } as unknown as ManagedObject)).toBe('test');
    });
});

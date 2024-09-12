import { sapCoreMock } from 'mock/window';
import type Element from 'sap/ui/core/Element';
import ManagedObjectMock from 'mock/sap/ui/base/ManagedObject';
import { isA, isManagedObject } from '../../../src/utils/core';

describe('ui5Utils', () => {
    const testElement = {} as Element;
    const testComponent = { id: '~id' };
    sapCoreMock.byId.mockReturnValue(testElement);
    sapCoreMock.getComponent.mockReturnValue(testComponent);

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getComponent', () => {
        beforeEach(() => {
            jest.resetModules();
        });

        test('sap.ui.getCore().getComponent (deprecated)', async () => {
            jest.mock('sap/ui/core/Component', () => {
                return {};
            });

            const { getComponent } = await import('../../../src/utils/core');
            const component = getComponent(testComponent.id);

            expect(sapCoreMock.getComponent).toBeCalledWith(testComponent.id);
            expect(component).toStrictEqual(testComponent);
        });

        test('Component.get (deprecated)', async () => {
            const Component = {
                get: jest.fn().mockReturnValue(testComponent)
            };
            jest.mock('sap/ui/core/Component', () => {
                return Component;
            });
            const { getComponent } = await import('../../../src/utils/core');
            const component = getComponent(testComponent.id);

            expect(Component.get).toBeCalledWith(testComponent.id);
            expect(sapCoreMock.getComponent).not.toBeCalled();
            expect(component).toStrictEqual(testComponent);
        });

        test('Component.getComponentById', async () => {
            const Component = {
                get: jest.fn().mockReturnValue(testComponent),
                getComponentById: jest.fn().mockReturnValue(testComponent)
            };
            jest.mock('sap/ui/core/Component', () => {
                return Component;
            });

            const { getComponent } = await import('../../../src/utils/core');
            const component = getComponent(testComponent.id);

            expect(Component.getComponentById).toBeCalledWith(testComponent.id);
            expect(Component.get).not.toBeCalled();
            expect(sapCoreMock.getComponent).not.toBeCalled();
            expect(component).toStrictEqual(testComponent);
        });
    });
});

describe('isManagedObject', () => {
    test('empty object', () => {
        expect(isManagedObject({})).toBe(false);
    });

    test('does not implement isA', () => {
        expect(isManagedObject({ isA: 5 })).toBe(false);
    });

    test('isA checks for "sap.ui.base.ManagedObject" ', () => {
        expect(isManagedObject({ isA: (type: string) => type === 'sap.ui.base.ManagedObject' })).toBe(true);
    });
});

describe('isA', () => {
    test('calls "isA" on ManagedObject', () => {
        const managedObject = new ManagedObjectMock();
        const spy = jest.spyOn(managedObject, 'isA').mockImplementation((type: string | string[]) => {
            return type === 'sap.ui.base.ManagedObject';
        });
        expect(isA('sap.ui.base.ManagedObject', managedObject)).toBe(true);
        expect(spy).toHaveBeenCalledWith('sap.ui.base.ManagedObject');
    });
});

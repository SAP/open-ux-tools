import { sapCoreMock } from 'mock/window';
import type Element from 'sap/ui/core/Element';
import ManagedObjectMock from 'mock/sap/ui/base/ManagedObject';
import type View from 'sap/ui/core/mvc/View';
import { isA, isManagedObject, findViewByControl } from '../../../src/utils/core';

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

            expect(sapCoreMock.getComponent).toHaveBeenCalledWith(testComponent.id);
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

            expect(Component.get).toHaveBeenCalledWith(testComponent.id);
            expect(sapCoreMock.getComponent).not.toHaveBeenCalled();
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

            expect(Component.getComponentById).toHaveBeenCalledWith(testComponent.id);
            expect(Component.get).not.toHaveBeenCalled();
            expect(sapCoreMock.getComponent).not.toHaveBeenCalled();
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

describe('findViewByControl', () => {
    test('returns undefined when control is null or undefined', () => {
        expect(findViewByControl(null as any)).toBeUndefined();
        expect(findViewByControl(undefined as any)).toBeUndefined();
    });

    test('returns the control itself if it is a view', () => {
        const mockView = new ManagedObjectMock() as unknown as View;
        const isASpy = jest.spyOn(mockView, 'isA').mockReturnValue(true);

        const result = findViewByControl(mockView);

        expect(isASpy).toHaveBeenCalledWith('sap.ui.core.mvc.View');
        expect(result).toBe(mockView);
    });

    test('traverses up the parent hierarchy to find a view', () => {
        // Create a mock view (grandparent)
        const mockView = new ManagedObjectMock() as unknown as View;
        const viewIsASpy = jest
            .spyOn(mockView, 'isA')
            .mockImplementation((type: string | string[]) => type === 'sap.ui.core.mvc.View');
        mockView.getViewName = jest.fn().mockReturnValue('TestView');

        // Create a mock parent (parent of the control)
        const mockParent = new ManagedObjectMock();
        const parentIsASpy = jest.spyOn(mockParent, 'isA').mockReturnValue(false);
        const parentGetParentSpy = jest.spyOn(mockParent, 'getParent').mockReturnValue(mockView);

        // Create the initial control
        const mockControl = new ManagedObjectMock();
        const controlIsASpy = jest.spyOn(mockControl, 'isA').mockReturnValue(false);
        const controlGetParentSpy = jest.spyOn(mockControl, 'getParent').mockReturnValue(mockParent);

        const result = findViewByControl(mockControl);

        // Verify the traversal happened
        expect(controlIsASpy).toHaveBeenCalledWith('sap.ui.core.mvc.View');
        expect(controlGetParentSpy).toHaveBeenCalled();
        expect(parentIsASpy).toHaveBeenCalledWith('sap.ui.core.mvc.View');
        expect(parentGetParentSpy).toHaveBeenCalled();
        expect(viewIsASpy).toHaveBeenCalledWith('sap.ui.core.mvc.View');
        expect(result).toBe(mockView);
    });

    test('returns undefined if no view is found in the hierarchy', () => {
        // Create a mock control with no parent
        const mockControl = new ManagedObjectMock();
        const controlIsASpy = jest.spyOn(mockControl, 'isA').mockReturnValue(false);
        const controlGetParentSpy = jest.spyOn(mockControl, 'getParent').mockReturnValue(null);

        const result = findViewByControl(mockControl);

        expect(controlIsASpy).toHaveBeenCalledWith('sap.ui.core.mvc.View');
        expect(controlGetParentSpy).toHaveBeenCalled();
        expect(result).toBeUndefined();
    });

    test('returns undefined if parent chain ends without finding a view', () => {
        // Create a mock parent that has no parent and is not a view
        const mockParent = new ManagedObjectMock();
        const parentIsASpy = jest.spyOn(mockParent, 'isA').mockReturnValue(false);
        const parentGetParentSpy = jest.spyOn(mockParent, 'getParent').mockReturnValue(null);

        // Create the initial control
        const mockControl = new ManagedObjectMock();
        const controlIsASpy = jest.spyOn(mockControl, 'isA').mockReturnValue(false);
        const controlGetParentSpy = jest.spyOn(mockControl, 'getParent').mockReturnValue(mockParent);

        const result = findViewByControl(mockControl);

        expect(controlIsASpy).toHaveBeenCalledWith('sap.ui.core.mvc.View');
        expect(controlGetParentSpy).toHaveBeenCalled();
        expect(parentIsASpy).toHaveBeenCalledWith('sap.ui.core.mvc.View');
        expect(parentGetParentSpy).toHaveBeenCalled();
        expect(result).toBeUndefined();
    });

    test('handles control without getParent method', () => {
        const mockControl = {
            isA: jest.fn().mockReturnValue(false)
            // Note: no getParent method
        } as any;

        const result = findViewByControl(mockControl);

        expect(mockControl.isA).toHaveBeenCalledWith('sap.ui.core.mvc.View');
        expect(result).toBeUndefined();
    });
});

import { createUi5Facade } from '../../../src/cpe/facade';
import OverlayUtil from 'sap/ui/dt/OverlayUtil';
import IconPool from 'mock/sap/ui/core/IconPool';
import Component from 'sap/ui/core/Component';
import { sapCoreMock } from 'mock/window';
import OverlayRegistry, { mockOverlay } from 'mock/sap/ui/dt/OverlayRegistry';
import type Element from 'sap/ui/core/Element';

describe('Facade', () => {
    const testElement = {} as Element;
    const testComponent = { id: '~id'};    
    sapCoreMock.byId.mockReturnValue(testElement);
    sapCoreMock.getComponent.mockReturnValue(testComponent);

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('getControlById', () => {
        const id = '~testId';
        const control = createUi5Facade().getControlById(id);
        expect(sapCoreMock.byId).toBeCalledWith(id);
        expect(control).toStrictEqual(testElement);
    });

    test('getComponent - deprecated', () => {
        (Component as any).get = undefined;
        const component = createUi5Facade().getComponent(testComponent.id);
        expect(sapCoreMock.getComponent).toBeCalledWith(testComponent.id);
        expect(component).toStrictEqual(testComponent);
    });

    test('getComponent', () => {
        Component.get = jest.fn().mockReturnValue(testComponent);
        const component = createUi5Facade().getComponent(testComponent.id);
        expect(Component.get).toBeCalledWith(testComponent.id);
        expect(sapCoreMock.getComponent).not.toBeCalled();
        expect(component).toStrictEqual(testComponent);
    });

    test('getOverlay', () => {
        const overlay = createUi5Facade().getOverlay(testElement);
        expect(OverlayRegistry.getOverlay).toBeCalledWith(testElement);
        expect(overlay).toStrictEqual(mockOverlay);
    });

    test('getClosestOverlayFor', () => {
        const overlay = createUi5Facade().getClosestOverlayFor(testElement);
        expect(OverlayUtil.getClosestOverlayFor).toBeCalledWith(testElement);
        expect(overlay).toStrictEqual(mockOverlay);
    });

    describe('getIcons', () => {
        const testIcons = {
            Reject: {
                content: 'reject',
                fontFamily: 'SAP-Icons'
            },
            'Accedental-Leave': {
                content: 'accendental-leave',
                fontFamily: 'SAP-Icons'
            },
            Accept: {
                content: 'accept',
                fontFamily: 'SAP-Icons'
            }
        }
        IconPool.getIconNames.mockReturnValueOnce(Object.keys(testIcons));
        IconPool.getIconInfo
            .mockReturnValueOnce(testIcons.Reject)
            .mockReturnValueOnce(testIcons['Accedental-Leave'])
            .mockReturnValueOnce(testIcons.Accept);

        test('control not found by id, search by component', () => {
            const icons = createUi5Facade().getIcons();

            expect(IconPool.getIconNames).toBeCalled();
            expect(IconPool.getIconInfo).toBeCalledTimes(Object.keys(testIcons).length);
            expect(icons).toMatchInlineSnapshot(`
                Array [
                  Object {
                    "content": "accendental-leave",
                    "fontFamily": "SAP-Icons",
                    "name": "accedental-leave",
                  },
                  Object {
                    "content": "accept",
                    "fontFamily": "SAP-Icons",
                    "name": "accept",
                  },
                  Object {
                    "content": "reject",
                    "fontFamily": "SAP-Icons",
                    "name": "reject",
                  },
                ]
            `);
        });
    });
});

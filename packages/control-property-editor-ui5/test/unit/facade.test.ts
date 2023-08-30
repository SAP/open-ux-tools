import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';
import { createUi5Facade } from '../../src/facade';
import OverlayUtil from 'sap/ui/dt/OverlayUtil';
import IconPool from 'sap/ui/core/IconPool';
import Component from 'sap/ui/core/Component';

describe('Facade', () => {
    const mockGetIconNames = jest.fn().mockReturnValueOnce(['Reject', 'Accedental-Leave', 'Accept']);
    const mockGetIconInfo = jest.fn();
    const mockById = jest.fn().mockReturnValue('control');
    const mockComponent = jest.fn().mockReturnValue({});
    beforeEach(() => {
        sap.ui.getCore = jest.fn().mockReturnValue({ byId: mockById, getComponent: mockComponent });
        IconPool.getIconNames = mockGetIconNames;
        IconPool.getIconInfo = mockGetIconInfo
            .mockReturnValueOnce({
                content: 'reject',
                fontFamily: 'SAP-Icons'
            })
            .mockReturnValueOnce({
                content: 'accendental-leave',
                fontFamily: 'SAP-Icons'
            })
            .mockReturnValueOnce({
                content: 'accept',
                fontFamily: 'SAP-Icons'
            });
        OverlayRegistry.getOverlay = jest.fn().mockReturnValue('testOverlay1');
        OverlayUtil.getClosestOverlayFor = jest.fn().mockReturnValue('testOverlay2');
    });

    test('getControlById', () => {
        const control = createUi5Facade().getControlById('abc');

        expect(sap.ui.getCore).toBeCalledTimes(1);
        expect(mockById).toBeCalledTimes(1);
        expect(control).toStrictEqual('control');
    });

    test('getComponent - deprecated', () => {
        Component.get = undefined as any;
        const component = createUi5Facade().getComponent('abc');

        expect(sap.ui.getCore).toBeCalledTimes(1);
        expect(mockComponent).toBeCalledTimes(1);
        expect(component).toStrictEqual({});
    });

    test('getComponent', () => {
        Component.get = jest.fn().mockReturnValue({});
        const component = createUi5Facade().getComponent('abc');

        expect(Component.get).toBeCalledTimes(1);
        expect(component).toStrictEqual({});
    });

    test('getOverlay', () => {
        const overlay = createUi5Facade().getOverlay({} as any);

        expect(OverlayRegistry.getOverlay).toBeCalledTimes(1);
        expect(overlay).toStrictEqual('testOverlay1');
    });

    test('getClosestOverlayFor', () => {
        const overlay = createUi5Facade().getClosestOverlayFor({} as any);

        expect(OverlayUtil.getClosestOverlayFor).toBeCalledTimes(1);
        expect(overlay).toStrictEqual('testOverlay2');
    });

    describe('getIcons', () => {
        test('control not found by id, search by component', () => {
            const icons = createUi5Facade().getIcons();

            expect(mockGetIconNames).toBeCalledTimes(1);
            expect(mockGetIconInfo).toBeCalledTimes(3);
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

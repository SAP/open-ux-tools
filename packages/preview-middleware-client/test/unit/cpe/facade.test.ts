import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';
import { createUi5Facade } from '../../../src/cpe/facade';
import OverlayUtil from 'sap/ui/dt/OverlayUtil';
import IconPool from 'sap/ui/core/IconPool';
import Component from 'sap/ui/core/Component';
import { sapCoreMock } from 'mock/window';

describe('Facade', () => {
    const testComponent = { id: '~id'};
    const mockGetIconNames = jest.fn().mockReturnValueOnce(['Reject', 'Accedental-Leave', 'Accept']);
    const mockGetIconInfo = jest.fn();
    sapCoreMock.byId.mockReturnValue('control');
    sapCoreMock.getComponent.mockReturnValue(testComponent);
    
    beforeEach(() => {
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

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('getControlById', () => {
        const control = createUi5Facade().getControlById('abc');
        expect(sapCoreMock.byId).toBeCalledTimes(1);
        expect(control).toStrictEqual('control');
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

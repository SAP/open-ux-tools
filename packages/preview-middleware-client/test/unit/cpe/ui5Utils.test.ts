import IconPool from 'mock/sap/ui/core/IconPool';
import Component from 'sap/ui/core/Component';
import { sapCoreMock } from 'mock/window';
import type Element from 'sap/ui/core/Element';
import { getComponent, getIcons } from '../../../src/cpe/ui5Utils';

describe('ui5Utils', () => {
    const testElement = {} as Element;
    const testComponent = { id: '~id'};    
    sapCoreMock.byId.mockReturnValue(testElement);
    sapCoreMock.getComponent.mockReturnValue(testComponent);

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('getComponent - deprecated', () => {
        (Component as any).get = undefined;
        const component = getComponent(testComponent.id);
        expect(sapCoreMock.getComponent).toBeCalledWith(testComponent.id);
        expect(component).toStrictEqual(testComponent);
    });

    test('getComponent', () => {
        Component.get = jest.fn().mockReturnValue(testComponent);
        const component = getComponent(testComponent.id);
        expect(Component.get).toBeCalledWith(testComponent.id);
        expect(sapCoreMock.getComponent).not.toBeCalled();
        expect(component).toStrictEqual(testComponent);
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
            const icons = getIcons();

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

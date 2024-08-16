import IconPool from 'mock/sap/ui/core/IconPool';
import { sapCoreMock } from 'mock/window';
import type Element from 'sap/ui/core/Element';
import { getIcons } from '../../../src/cpe/ui5-utils';

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

            const { getComponent } = await import('../../../src/cpe/ui5-utils');
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

            const { getComponent } = await import('../../../src/cpe/ui5-utils');
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

            const { getComponent } = await import('../../../src/cpe/ui5-utils');
            const component = getComponent(testComponent.id);

            expect(Component.getComponentById).toBeCalledWith(testComponent.id);
            expect(Component.get).not.toBeCalled();
            expect(sapCoreMock.getComponent).not.toBeCalled();
            expect(component).toStrictEqual(testComponent);
        });
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
        };
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

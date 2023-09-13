import type UI5Element from 'sap/ui/core/Element';
import { handler, initFragment } from '../../../../src/adp/dialogs/fragment';
import XMLView from 'mock/sap/ui/core/mvc/XMLView';
import Controller from 'mock/sap/ui/core/mvc/Controller';
import rtaMock from 'mock/sap/ui/rta/RuntimeAuthoring';

describe('Fragment Dialog', () => {
    describe('initFragment', () => {
        afterEach(() => {
            jest.restoreAllMocks();
        });

        test('adds a new item to the context menu', () => {
            const addMenuItemSpy = jest.fn();
            rtaMock.getDefaultPlugins.mockReturnValueOnce({
                contextMenu: {
                    addMenuItem: addMenuItemSpy
                }
            });
            initFragment(rtaMock);
            expect(addMenuItemSpy.mock.calls.length).toBe(1);
        });

        test('addMenuItem handler function', async () => {
            Controller.create.mockResolvedValue({ overlays: {}, rta: {} });

            await handler({} as unknown as UI5Element[], rtaMock);

            expect(XMLView.create.mock.calls.length).toBe(1);
        });
    });
});

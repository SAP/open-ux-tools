import type UI5Element from 'sap/ui/core/Element';
import { DialogNames, handler, initDialogs } from '../../../src/adp/init-dialogs';
import XMLView from 'mock/sap/ui/core/mvc/XMLView';
import Controller from 'mock/sap/ui/core/mvc/Controller';
import rtaMock from 'mock/sap/ui/rta/RuntimeAuthoring';

describe('Dialogs', () => {
    describe('initDialogs', () => {
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
            initDialogs(rtaMock);
            expect(addMenuItemSpy.mock.calls.length).toBe(1);
        });

        test('addMenuItem handler function', async () => {
            Controller.create.mockResolvedValue({ overlays: {}, rta: {} });

            await handler({} as unknown as UI5Element, rtaMock, DialogNames.ADD_FRAGMENT);

            expect(XMLView.create.mock.calls.length).toBe(1);
        });
    });
});

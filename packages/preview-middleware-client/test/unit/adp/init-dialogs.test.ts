import type UI5Element from 'sap/ui/core/Element';
import { DialogNames, handler, initDialogs } from '../../../src/adp/init-dialogs';
import XMLView from 'mock/sap/ui/core/mvc/XMLView';
import Controller from 'mock/sap/ui/core/mvc/Controller';
import RuntimeAuthoringMock from 'mock/sap/ui/rta/RuntimeAuthoring';
import { RTAOptions } from 'sap/ui/rta/RuntimeAuthoring';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

describe('Dialogs', () => {
    describe('initDialogs', () => {
        afterEach(() => {
            jest.restoreAllMocks();
        });

        test('adds a new item to the context menu', () => {
            const addMenuItemSpy = jest.fn();
            const rtaMock = new RuntimeAuthoringMock({} as RTAOptions);
            rtaMock.getDefaultPlugins.mockReturnValueOnce({
                contextMenu: {
                    addMenuItem: addMenuItemSpy
                }
            });
            initDialogs(rtaMock as unknown as RuntimeAuthoring);
            expect(addMenuItemSpy).toHaveBeenCalledTimes(2);
        });

        test('addMenuItem handler function', async () => {
            Controller.create.mockResolvedValue({ overlays: {}, rta: {} });
            const rtaMock = new RuntimeAuthoringMock({} as RTAOptions);

            await handler(
                {} as unknown as UI5Element,
                rtaMock as unknown as RuntimeAuthoring,
                DialogNames.ADD_FRAGMENT
            );
            await handler(
                {} as unknown as UI5Element,
                rtaMock as unknown as RuntimeAuthoring,
                DialogNames.CONTROLLER_EXTENSION
            );
            await handler(
                {} as unknown as UI5Element,
                rtaMock as unknown as RuntimeAuthoring,
                DialogNames.ADD_FRAGMENT_AT_EXTENSION_POINT
            );

            expect(XMLView.create).toHaveBeenCalledTimes(3);
        });
    });
});

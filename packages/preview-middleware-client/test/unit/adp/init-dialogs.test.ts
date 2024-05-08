import type UI5Element from 'sap/ui/core/Element';
import { RTAOptions } from 'sap/ui/rta/RuntimeAuthoring';
import type ElementOverlay from 'sap/ui/dt/ElementOverlay';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

import { sapMock } from 'mock/window';
import Utils from 'mock/sap/ui/fl/Utils';
import Fragment from 'mock/sap/ui/core/Fragment';
import Controller from 'mock/sap/ui/core/mvc/Controller';
import RuntimeAuthoringMock from 'mock/sap/ui/rta/RuntimeAuthoring';

import { DialogNames, handler, initDialogs, isFragmentCommandEnabled } from '../../../src/adp/init-dialogs';
import AddFragment from '../../../src/adp/controllers/AddFragment.controller';
import ControllerExtension from '../../../src/adp/controllers/ControllerExtension.controller';
import ExtensionPoint from '../../../src/adp/controllers/ExtensionPoint.controller';

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
            sapMock.ui.version = '1.120.4';
            Controller.create.mockResolvedValue({ overlays: {}, rta: { 'yes': 'no' } });
            const rtaMock = new RuntimeAuthoringMock({} as RTAOptions);

            AddFragment.prototype.setup = jest.fn();
            ControllerExtension.prototype.setup = jest.fn();
            ExtensionPoint.prototype.setup = jest.fn();

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

            expect(Fragment.load).toHaveBeenCalledTimes(3);
        });
    });

    describe('isFragmentCommandEnabled', () => {
        beforeEach(() => {
            jest.restoreAllMocks();
        });

        const overlay = {
            getElement: () => ({})
        } as ElementOverlay;

        it('should return true if there is one overlay with a stable ID', () => {
            Utils.checkControlId.mockReturnValue(true);

            const result = isFragmentCommandEnabled([overlay]);

            expect(result).toBe(true);
            expect(Utils.checkControlId).toHaveBeenCalledWith({});
        });

        it('should return false if there is one overlay without a stable ID', () => {
            Utils.checkControlId.mockReturnValue(false);

            const result = isFragmentCommandEnabled([overlay]);

            expect(result).toBe(false);
            expect(Utils.checkControlId).toHaveBeenCalledWith({});
        });

        it('should return false if there are multiple overlays even with stable IDs', () => {
            Utils.checkControlId.mockReturnValue(true);

            const result = isFragmentCommandEnabled([overlay, overlay]);

            expect(result).toBe(false);
        });

        it('should return false if no overlays are provided', () => {
            const result = isFragmentCommandEnabled([]);

            expect(result).toBe(false);
        });
    });
});

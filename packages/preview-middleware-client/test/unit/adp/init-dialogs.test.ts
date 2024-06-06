import type UI5Element from 'sap/ui/core/Element';
import { RTAOptions } from 'sap/ui/rta/RuntimeAuthoring';
import type ElementOverlay from 'sap/ui/dt/ElementOverlay';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

import FlUtils from 'sap/ui/fl/Utils';
import { sapMock } from 'mock/window';
import Utils from 'mock/sap/ui/fl/Utils';
import Fragment from 'mock/sap/ui/core/Fragment';
import Controller from 'mock/sap/ui/core/mvc/Controller';
import RuntimeAuthoringMock from 'mock/sap/ui/rta/RuntimeAuthoring';

import {
    DialogNames,
    handler,
    initDialogs,
    isReuseComponent,
    isControllerExtensionEnabled,
    isFragmentCommandEnabled,
    getAddFragmentItemText
} from '../../../src/adp/init-dialogs';
import AddFragment from '../../../src/adp/controllers/AddFragment.controller';
import ControllerExtension from '../../../src/adp/controllers/ControllerExtension.controller';
import ExtensionPoint from '../../../src/adp/controllers/ExtensionPoint.controller';

describe('Dialogs', () => {
    const componentMock = {
        getComponentById: jest.fn().mockReturnValue({
            getManifest: () => {
                return {
                    ['sap.app']: {
                        type: 'component'
                    }
                };
            }
        })
    };
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
            initDialogs(rtaMock as unknown as RuntimeAuthoring, []);
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
        afterEach(() => {
            jest.restoreAllMocks();
        });

        const overlay = {
            getElement: jest.fn().mockReturnValue({ getId: jest.fn() })
        } as unknown as ElementOverlay;

        it('should return false if there is one overlay with a stable ID and it is reuse component', () => {
            Utils.checkControlId.mockReturnValue(true);
            sapMock.ui.require = jest.fn().mockReturnValue(componentMock);
            const result = isFragmentCommandEnabled([overlay]);

            expect(result).toBe(false);
        });

        it('should return false if there is one overlay without a stable ID and it is reuse component', () => {
            Utils.checkControlId.mockReturnValue(false);
            const result = isFragmentCommandEnabled([overlay]);
            sapMock.ui.require = jest.fn().mockReturnValue(componentMock);

            expect(result).toBe(false);
        });

        it('should return false if there are multiple overlays even with stable IDs', () => {
            Utils.checkControlId.mockReturnValue(true);
            const result = isFragmentCommandEnabled([overlay, overlay]);

            expect(result).toBe(false);
        });

        it('should return true if there is one overlay with a stable ID and it is not reuse component', () => {
            Utils.checkControlId.mockReturnValue(true);
            sapMock.ui.version = '1.112.1';
            const result = isFragmentCommandEnabled([overlay]);

            expect(result).toBe(true);
        });

        it('should return false if no overlays are provided', () => {
            const result = isFragmentCommandEnabled([]);

            expect(result).toBe(false);
        });
    });

    describe('getAddFragmentItemText', () => {
        beforeEach(() => {
            jest.restoreAllMocks();
        });

        const overlay = {
            getElement: () => ({})
        } as ElementOverlay;

        it('should return simple text if the control is with a stable ID', () => {
            Utils.checkControlId.mockReturnValue(true);

            const result = getAddFragmentItemText(overlay);

            expect(result).toBe('Add: Fragment');
            expect(Utils.checkControlId).toHaveBeenCalledWith({});
        });

        it('should return extra text if the control is with a unstable ID', () => {
            Utils.checkControlId.mockReturnValue(false);

            const result = getAddFragmentItemText(overlay);

            expect(result).toBe('Add: Fragment (Unavailable due to unstable ID of the control or its parent control)');
            expect(Utils.checkControlId).toHaveBeenCalledWith({});
        });
    });

    describe('isControllerExtensionEnabled', () => {
        const elementOverlayMock = { getElement: jest.fn() } as unknown as ElementOverlay;
        const syncViewsIds = ['syncViewId1', 'syncViewId2'];

        afterEach(() => {
            jest.restoreAllMocks();
        });

        
        it('should return false when overlays array is empty', () => {
            expect(isControllerExtensionEnabled([], syncViewsIds)).toBe(false);
        });

        it('should return true when overlays length is 1 and clickedControlId is not in syncViewsIds and it is not reuse component', () => {
            FlUtils.getViewForControl = jest.fn().mockReturnValue({ getId: jest.fn().mockReturnValue('asyncViewId2') });
            sapMock.ui.version = '1.112.1';
            const overlays: ElementOverlay[] = [elementOverlayMock];
            expect(isControllerExtensionEnabled(overlays, syncViewsIds)).toBe(true);
        });

        it('should return false when overlays length is 1 and clickedControlId is not in syncViewsIds and it is reuse component', () => {
            FlUtils.getViewForControl = jest.fn().mockReturnValue({ getId: jest.fn().mockReturnValue('asyncViewId4') });
            const overlays: ElementOverlay[] = [elementOverlayMock];
            sapMock.ui.version = '1.118.1';
            sapMock.ui.require = jest.fn().mockReturnValue(componentMock);
            expect(isControllerExtensionEnabled(overlays, syncViewsIds)).toBe(false);
        });

        it('should return false when overlays length is more than 1', () => {
            FlUtils.getViewForControl = jest.fn().mockReturnValue({ getId: jest.fn().mockReturnValue('syncViewId3') });
            const overlays: ElementOverlay[] = [elementOverlayMock, elementOverlayMock];
            const syncViewsIds = ['syncViewId1', 'syncViewId2'];
            expect(isControllerExtensionEnabled(overlays, syncViewsIds)).toBe(false);
        });
    });

    describe('isReuseComponent', () => {
        const clickedControlId = 'someViewId';
        it('should return false for ui5 minor version lower than 114', () => {
            sapMock.ui.version = '1.112.1';
            expect(isReuseComponent(clickedControlId)).toBe(false);
        });

        it('should return false when cannot find component with clicked control Id', () => {
            sapMock.ui.version = '1.118.1';
            sapMock.ui.require = jest.fn().mockReturnValue({
                getComponentById: () => undefined
            });

            expect(isReuseComponent(clickedControlId)).toBe(false);
        });

        it('should return false when manifest is undefined', () => {
            sapMock.ui.version = '1.118.1';
            sapMock.ui.require = jest.fn().mockReturnValue({
                getComponentById: jest.fn().mockReturnValue({
                    getManifest: () => undefined
                })
            });

            expect(isReuseComponent(clickedControlId)).toBe(false);
        });

        it('should return false when type is not component', () => {
            sapMock.ui.version = '1.118.1';
            sapMock.ui.require = jest.fn().mockReturnValue({
                getComponentById: jest.fn().mockReturnValue({
                    getManifest: () => {
                        return {
                            ['sap.app']: {
                                type: 'view'
                            }
                        };
                    }
                })
            });

            expect(isReuseComponent(clickedControlId)).toBe(false);
        });

        it('should return true when type is component', () => {
            sapMock.ui.version = '1.118.1';
            sapMock.ui.require = jest.fn().mockReturnValue(componentMock);

            expect(isReuseComponent(clickedControlId)).toBe(true);
        });
    });
});

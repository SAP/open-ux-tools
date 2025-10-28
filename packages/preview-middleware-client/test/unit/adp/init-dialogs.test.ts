import type { RTAOptions } from 'sap/ui/rta/RuntimeAuthoring';
import type ElementOverlay from 'sap/ui/dt/ElementOverlay';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import hasStableId from 'mock/sap/ui/rta/util/hasStableId';
import FlUtils from 'mock/sap/ui/fl/Utils';
import RuntimeAuthoringMock from 'mock/sap/ui/rta/RuntimeAuthoring';
import {
    initDialogs,
    isControllerExtensionEnabled,
    isFragmentCommandEnabled,
    getAddFragmentItemText,
    getExtendControllerItemText
} from '../../../src/adp/init-dialogs';
import { getTextBundle } from '../../../src/i18n';
import * as syncViewsUtils from '../../../src/adp/sync-views-utils';

describe('Dialogs', () => {
    let isReuseComponentMock = jest.fn().mockReturnValue(false);
    jest.spyOn(syncViewsUtils, 'getSyncViewIds').mockReturnValue(new Set<string>());
    describe('initDialogs', () => {
        afterEach(() => {
            jest.restoreAllMocks();
        });

        test('adds a new item to the context menu', async () => {
            const addMenuItemSpy = jest.fn();
            const rtaMock = new RuntimeAuthoringMock({} as RTAOptions);
            rtaMock.getDefaultPlugins.mockReturnValueOnce({
                contextMenu: {
                    addMenuItem: addMenuItemSpy
                }
            });
            await initDialogs(rtaMock as unknown as RuntimeAuthoring, { major: 1, minor: 118 });
            expect(addMenuItemSpy).toHaveBeenCalledTimes(2);
        });
    });

    describe('isFragmentCommandEnabled', () => {
        afterEach(() => {
            jest.restoreAllMocks();
        });

        const overlay = {
            getElement: jest.fn().mockReturnValue({ getId: jest.fn() })
        } as unknown as ElementOverlay;

        it('should return false if there is one overlay with a stable ID and it is reuse component - Cloud', () => {
            hasStableId.mockImplementation(() => {
                return true;
            });
            isReuseComponentMock.mockReturnValueOnce(true);
            const result = isFragmentCommandEnabled([overlay], isReuseComponentMock, true);

            expect(result).toBe(false);
        });

        it('should return false if there is one overlay without a stable ID and it is reuse component', () => {
            hasStableId.mockImplementation(() => {
                return false;
            });
            isReuseComponentMock.mockReturnValueOnce(true);
            const result = isFragmentCommandEnabled([overlay], isReuseComponentMock, false);

            expect(result).toBe(false);
        });

        it('should return false if there are multiple overlays even with stable IDs', () => {
            hasStableId.mockImplementation(() => {
                return true;
            });
            const result = isFragmentCommandEnabled([overlay, overlay], isReuseComponentMock, false);

            expect(result).toBe(false);
        });

        it('should return true if there is one overlay with a stable ID and it is not reuse component', () => {
            hasStableId.mockImplementation(() => {
                return true;
            });
            const result = isFragmentCommandEnabled([overlay], isReuseComponentMock, false);

            expect(result).toBe(true);
        });

        it('should return false if no overlays are provided', () => {
            const result = isFragmentCommandEnabled([], isReuseComponentMock, false);

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

        it('should return simple text if the control is with a stable ID', async () => {
            const resources = await getTextBundle();
            hasStableId.mockImplementation(() => {
                return true;
            });
            const result = getAddFragmentItemText(overlay, isReuseComponentMock, false, resources);

            expect(result).toBe('Add: Fragment');
            expect(hasStableId).toHaveBeenCalledWith({
                getElement: expect.any(Function)
            });
        });

        it('should return extra text if the control is with a unstable ID', async () => {
            const resources = await getTextBundle();
            hasStableId.mockImplementation(() => {
                return false;
            });

            const result = getAddFragmentItemText(overlay, isReuseComponentMock, false, resources);

            expect(result).toBe(
                'Add: Fragment (This action is disabled because the control or parent control has an unstable ID)'
            );
            expect(hasStableId).toHaveBeenCalledWith({
                getElement: expect.any(Function)
            });
        });

        it('should return extra text if the control is a reuse component in Cloud', async () => {
            const resources = await getTextBundle();
            const overlay = {
                getElement: () => ({
                    getId: () => {
                        return 'controlId1';
                    }
                })
            } as ElementOverlay;
            hasStableId.mockImplementation(() => {
                return true;
            });
            isReuseComponentMock.mockReturnValueOnce(true);

            const result = getAddFragmentItemText(overlay, isReuseComponentMock, true, resources);

            expect(result).toBe('Add: Fragment (This action is disabled because the control is a reuse component)');
            expect(hasStableId).toHaveBeenCalledWith({
                getElement: expect.any(Function)
            });
            expect(isReuseComponentMock).toHaveBeenCalledWith('controlId1');
        });
    });

    describe('getExtendControllerItemText', () => {
        beforeEach(() => {
            jest.restoreAllMocks();
            jest.resetAllMocks();
        });

        it('should return simple text if the control is a reuse component in OnPremise', async () => {
            FlUtils.getViewForControl.mockReturnValue({ getId: jest.fn().mockReturnValue('asyncViewId1') });
            const resources = await getTextBundle();
            const overlay = {
                getElement: () => ({
                    getId: () => {
                        return 'controlId1';
                    }
                })
            } as ElementOverlay;
            isReuseComponentMock.mockReturnValueOnce(true);
            const result = getExtendControllerItemText(overlay, isReuseComponentMock, false, resources);

            expect(result).toBe('Extend Controller');
            expect(isReuseComponentMock).not.toHaveBeenCalled();
        });

        it('should return simple text if the control is not a reuse component in Cloud', async () => {
            FlUtils.getViewForControl.mockReturnValue({ getId: jest.fn().mockReturnValue('asyncViewId1') });
            const resources = await getTextBundle();
            const overlay = {
                getElement: () => ({
                    getId: () => {
                        return 'controlId1';
                    }
                })
            } as ElementOverlay;
            const result = getExtendControllerItemText(overlay, isReuseComponentMock, true, resources);

            expect(result).toBe('Extend Controller');
            expect(isReuseComponentMock).toHaveBeenCalledWith('controlId1');
        });

        it('should return extra text if the control is a reuse component in Cloud', async () => {
            FlUtils.getViewForControl.mockReturnValue({ getId: jest.fn().mockReturnValue('asyncViewId1') });
            const resources = await getTextBundle();
            const overlay = {
                getElement: () => ({
                    getId: () => {
                        return 'controlId1';
                    }
                })
            } as ElementOverlay;
            isReuseComponentMock.mockReturnValueOnce(true);

            const result = getExtendControllerItemText(overlay, isReuseComponentMock, true, resources);

            expect(result).toBe('Extend Controller (This action is disabled because the control is a reuse component)');
            expect(isReuseComponentMock).toHaveBeenCalledWith('controlId1');
        });

        it('should return extra text if the control is part of a sync view', async () => {
            FlUtils.getViewForControl.mockReturnValue({ getId: jest.fn().mockReturnValue('syncViewId1') });
            const resources = await getTextBundle();
            const overlay = {
                getElement: () => ({
                    getId: () => {
                        return 'controlId1';
                    }
                })
            } as ElementOverlay;
            const syncViewsIds = new Set<string>(['syncViewId1', 'syncViewId2']);
            jest.spyOn(syncViewsUtils, 'getSyncViewIds').mockReturnValueOnce(syncViewsIds);

            const result = getExtendControllerItemText(overlay, isReuseComponentMock, false, resources);

            expect(result).toBe(
                'Extend Controller (This action is disabled because the controls are part of a synchronous view)'
            );
        });
    });

    describe('isControllerExtensionEnabled', () => {
        const elementOverlayMock = { getElement: jest.fn() } as unknown as ElementOverlay;
        const syncViewsIds = new Set<string>(['syncViewId1', 'syncViewId2']);
        jest.spyOn(syncViewsUtils, 'getSyncViewIds').mockReturnValue(syncViewsIds);

        afterEach(() => {
            jest.resetAllMocks();
            jest.restoreAllMocks();
        });

        it('should return false when overlays array is empty', () => {
            expect(isControllerExtensionEnabled([], isReuseComponentMock, false)).toBe(false);
        });

        it('should return true when overlays length is 1 and clickedControlId is not in syncViewsIds and it is not reuse component', () => {
            FlUtils.getViewForControl = jest.fn().mockReturnValue({ getId: jest.fn().mockReturnValue('asyncViewId2') });
            const overlays: ElementOverlay[] = [elementOverlayMock];
            expect(isControllerExtensionEnabled(overlays, isReuseComponentMock, false)).toBe(true);
        });

        it('should return true when overlays length is 1 and clickedControlId is not in syncViewsIds and it is reuse component - OnPremise', () => {
            FlUtils.getViewForControl = jest.fn().mockReturnValue({ getId: jest.fn().mockReturnValue('asyncViewId4') });
            const overlays: ElementOverlay[] = [elementOverlayMock];
            isReuseComponentMock.mockReturnValueOnce(true);
            expect(isControllerExtensionEnabled(overlays, isReuseComponentMock, false)).toBe(true);
            expect(isReuseComponentMock).not.toHaveBeenCalled();
        });

        it('should return false when overlays length is 1 and clickedControl is not in syncViewsIds and it is reuse component - Cloud', () => {
            const elementOverlayMock = {
                getElement: jest.fn().mockReturnValue({
                    getId: () => {
                        return 'controlId1';
                    }
                })
            } as unknown as ElementOverlay;
            FlUtils.getViewForControl = jest.fn().mockReturnValue({ getId: jest.fn().mockReturnValue('syncViewId3') });
            const overlays: ElementOverlay[] = [elementOverlayMock];
            isReuseComponentMock.mockReturnValueOnce(true);
            expect(isControllerExtensionEnabled(overlays, isReuseComponentMock, true)).toBe(false);
        });

        it('should return false when overlays length is more than 1', () => {
            FlUtils.getViewForControl = jest.fn().mockReturnValue({ getId: jest.fn().mockReturnValue('syncViewId3') });
            const overlays: ElementOverlay[] = [elementOverlayMock, elementOverlayMock];
            expect(isControllerExtensionEnabled(overlays, isReuseComponentMock, false)).toBe(false);
        });
    });
});

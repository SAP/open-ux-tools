import { RTAOptions } from 'sap/ui/rta/RuntimeAuthoring';
import type ElementOverlay from 'sap/ui/dt/ElementOverlay';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import hasStableId from 'mock/sap/ui/rta/util/hasStableId';

import FlUtils from 'sap/ui/fl/Utils';
import RuntimeAuthoringMock from 'mock/sap/ui/rta/RuntimeAuthoring';

import {
    initDialogs,
    isControllerExtensionEnabled,
    isFragmentCommandEnabled,
    getAddFragmentItemText
} from '../../../src/adp/init-dialogs';
import * as cpeUtils from '../../../src/cpe/utils';

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
            initDialogs(rtaMock as unknown as RuntimeAuthoring, [], { major: 1, minor: 118 });
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

        it('should return false if there is one overlay with a stable ID and it is reuse component', () => {
            hasStableId.mockImplementation(() => {
                return true;
            });
            jest.spyOn(cpeUtils, 'isReuseComponent').mockReturnValue(true);
            const result = isFragmentCommandEnabled([overlay], { major: 1, minor: 118 });

            expect(result).toBe(false);
        });

        it('should return false if there is one overlay without a stable ID and it is reuse component', () => {
            hasStableId.mockImplementation(() => {
                return false;
            });
            jest.spyOn(cpeUtils, 'isReuseComponent').mockReturnValue(true);
            const result = isFragmentCommandEnabled([overlay], { major: 1, minor: 118 });

            expect(result).toBe(false);
        });

        it('should return false if there are multiple overlays even with stable IDs', () => {
            hasStableId.mockImplementation(() => {
                return true;
            });
            const result = isFragmentCommandEnabled([overlay, overlay], { major: 1, minor: 118 });

            expect(result).toBe(false);
        });

        it('should return true if there is one overlay with a stable ID and it is not reuse component', () => {
            hasStableId.mockImplementation(() => {
                return true;
            });
            jest.spyOn(cpeUtils, 'isReuseComponent').mockReturnValue(false);
            const result = isFragmentCommandEnabled([overlay], { major: 1, minor: 112 });

            expect(result).toBe(true);
        });

        it('should return false if no overlays are provided', () => {
            const result = isFragmentCommandEnabled([], { major: 1, minor: 118 });

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
            hasStableId.mockImplementation(() => {
                return true;
            });

            const result = getAddFragmentItemText(overlay);

            expect(result).toBe('Add: Fragment');
            expect(hasStableId).toHaveBeenCalledWith({
                getElement: expect.any(Function)
            });
        });

        it('should return extra text if the control is with a unstable ID', () => {
            hasStableId.mockImplementation(() => {
                return false;
            });

            const result = getAddFragmentItemText(overlay);

            expect(result).toBe('Add: Fragment (Unavailable due to unstable ID of the control or its parent control)');
            expect(hasStableId).toHaveBeenCalledWith({
                getElement: expect.any(Function)
            });
        });
    });

    describe('isControllerExtensionEnabled', () => {
        const elementOverlayMock = { getElement: jest.fn() } as unknown as ElementOverlay;
        const syncViewsIds = ['syncViewId1', 'syncViewId2'];

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should return false when overlays array is empty', () => {
            expect(isControllerExtensionEnabled([], syncViewsIds, { major: 1, minor: 118 })).toBe(false);
        });

        it('should return true when overlays length is 1 and clickedControlId is not in syncViewsIds and it is not reuse component', () => {
            FlUtils.getViewForControl = jest.fn().mockReturnValue({ getId: jest.fn().mockReturnValue('asyncViewId2') });
            jest.spyOn(cpeUtils, 'isReuseComponent').mockReturnValue(false);
            const overlays: ElementOverlay[] = [elementOverlayMock];
            expect(isControllerExtensionEnabled(overlays, syncViewsIds, { major: 1, minor: 112 })).toBe(true);
        });

        it('should return false when overlays length is 1 and clickedControlId is not in syncViewsIds and it is reuse component', () => {
            FlUtils.getViewForControl = jest.fn().mockReturnValue({ getId: jest.fn().mockReturnValue('asyncViewId4') });
            const overlays: ElementOverlay[] = [elementOverlayMock];
            jest.spyOn(cpeUtils, 'isReuseComponent').mockReturnValue(true);
            expect(isControllerExtensionEnabled(overlays, syncViewsIds, { major: 1, minor: 118 })).toBe(false);
        });

        it('should return false when overlays length is more than 1', () => {
            FlUtils.getViewForControl = jest.fn().mockReturnValue({ getId: jest.fn().mockReturnValue('syncViewId3') });
            const overlays: ElementOverlay[] = [elementOverlayMock, elementOverlayMock];
            const syncViewsIds = ['syncViewId1', 'syncViewId2'];
            expect(isControllerExtensionEnabled(overlays, syncViewsIds, { major: 1, minor: 118 })).toBe(false);
        });
    });
});

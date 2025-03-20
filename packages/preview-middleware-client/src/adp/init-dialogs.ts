/** sap.ui.core */
import UI5Element from 'sap/ui/core/Element';

/** sap.ui.rta */
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import hasStableId from 'sap/ui/rta/util/hasStableId';

/** sap.ui.fl */
import FlUtils from 'sap/ui/fl/Utils';

/** sap.ui.dt */
import type ElementOverlay from 'sap/ui/dt/ElementOverlay';

import ManagedObject from 'sap/ui/base/ManagedObject';
import { DialogFactory, DialogNames } from './dialog-factory';
import type { IsReuseComponentApi } from '../cpe/types';

/**
 * Handler for enablement of Extend With Controller context menu entry
 *
 * @param control UI5 control.
 * @param syncViewsIds Runtime Authoring
 * @param isReuseComponent Function to check if the control is a reuse component.
 * @param isCloud Whether the application is running in the cloud
 *
 * @returns boolean whether menu item is enabled or not
 */
export function isControllerExtensionEnabledForControl(
    control: ManagedObject,
    syncViewsIds: string[],
    isReuseComponent: IsReuseComponentApi,
    isCloud: boolean
): boolean {
    const viewId = FlUtils.getViewForControl(control).getId();
    const isControlInSyncView = syncViewsIds.includes(viewId);

    if(isCloud) {
        const isClickedControlReuseComponent = isReuseComponent(control.getId());
        return !isControlInSyncView && !isClickedControlReuseComponent;
    }
    return !isControlInSyncView;
}

/**
 * Handler for enablement of Extend With Controller context menu entry
 *
 * @param overlays Control overlays
 * @param syncViewsIds Runtime Authoring
 * @param isReuseComponent Function to check if the control is a reuse component.
 * @param isCloud Whether the application is running in the cloud
 *
 * @returns boolean whether menu item is enabled or not
 */
export const isControllerExtensionEnabled = (
    overlays: ElementOverlay[],
    syncViewsIds: string[],
    isReuseComponent: IsReuseComponentApi,
    isCloud: boolean
): boolean => {
    if (overlays.length === 0 || overlays.length > 1) {
        return false;
    }
    return isControllerExtensionEnabledForControl(overlays[0].getElement(), syncViewsIds, isReuseComponent, isCloud);
};

/**
 * Determines whether the fragment command should be enabled based on the provided overlays.
 *
 * @param {ElementOverlay[]} overlays - An array of ElementOverlay objects representing the UI overlays.
 * @param {isReuseComponentApi} isReuseComponent - Function to check if the control is a reuse component.
 * @param {boolean} isCloud - Whether the application is running in the cloud.
 * @returns {boolean} True if the fragment command is enabled, false otherwise.
 */
export const isFragmentCommandEnabled = (overlays: ElementOverlay[], isReuseComponent: IsReuseComponentApi, isCloud: boolean): boolean => {
    if (overlays.length === 0 || overlays.length > 1) {
        return false;
    }

    const control = overlays[0].getElement();
    const stableId = hasStableId(overlays[0]);
    if (isCloud) {
        return stableId && !isReuseComponent(control.getId());
    }

    return stableId;
};

/**
 * Determines the text that should be displayed for the Add Fragment context menu item.
 *
 * @param {ElementOverlay} overlay - An ElementOverlay object representing the UI overlay.
 * @param {isReuseComponentApi} isReuseComponentChecker - Function to check if the control is a reuse component.
 * @param {boolean} isCloud - Whether the application is running in the cloud.
 * @returns {string} The text of the Add Fragment context menu item.
 */
export const getAddFragmentItemText = (overlay: ElementOverlay, isReuseComponentChecker: IsReuseComponentApi, isCloud: boolean) => {
    if (isCloud && isReuseComponentChecker(overlay.getElement().getId())) {
        return 'Add: Fragment (Unavailable due to control being a Reuse component)';
    }
    if (!hasStableId(overlay)) {
        return 'Add: Fragment (Unavailable due to unstable ID of the control or its parent control)';
    }

    return 'Add: Fragment';
};

/**
 * Determines the text that should be displayed for Controller Extension context menu item.
 *
 * @param {ElementOverlay} overlay - An ElementOverlay object representing the UI overlay.
 * @param {isReuseComponentApi} isReuseComponentChecker - Function to check if the control is a reuse component.
 * @param {boolean} isCloud - Whether the application is running in the cloud.
 * @returns {string} The text of the Add Fragment context menu item.
 */
export const getExtendControllerItemText = (overlay: ElementOverlay, isReuseComponentChecker: IsReuseComponentApi, isCloud: boolean) => {
    if (isCloud && isReuseComponentChecker(overlay.getElement().getId())) {
        return 'Extend With Controller (Unavailable due to control being a Reuse component)';
    }

    return 'Extend With Controller';
};

/**
 * Adds a new item to the context menu
 *
 * @param rta Runtime Authoring
 * @param syncViewsIds Ids of all application sync views
 * @param isReuseComponentChecker Function to check if the control is a reuse component
 */
export const initDialogs = (rta: RuntimeAuthoring, syncViewsIds: string[], isReuseComponentChecker: IsReuseComponentApi): void => {
    const contextMenu = rta.getDefaultPlugins().contextMenu;
    const isCloud = rta.getFlexSettings().isCloud;

    contextMenu.addMenuItem({
        id: 'ADD_FRAGMENT',
        text: (overlay: ElementOverlay) => getAddFragmentItemText(overlay, isReuseComponentChecker, isCloud),
        handler: async (overlays: UI5Element[]) =>
            await DialogFactory.createDialog(overlays[0], rta, DialogNames.ADD_FRAGMENT),
        icon: 'sap-icon://attachment-html',
        enabled: (overlays: ElementOverlay[]) => isFragmentCommandEnabled(overlays, isReuseComponentChecker, isCloud)
    });

    contextMenu.addMenuItem({
        id: 'EXTEND_CONTROLLER',
        text: (overlay: ElementOverlay) => getExtendControllerItemText(overlay, isReuseComponentChecker, isCloud),
        handler: async (overlays: UI5Element[]) =>
            await DialogFactory.createDialog(overlays[0], rta, DialogNames.CONTROLLER_EXTENSION),
        icon: 'sap-icon://create-form',
        enabled: (overlays: ElementOverlay[]) => isControllerExtensionEnabled(overlays, syncViewsIds, isReuseComponentChecker, isCloud)
    });
};

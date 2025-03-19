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
import { getReuseComponentChecker } from '../cpe/utils';
import { Ui5VersionInfo } from '../utils/version';
import { DialogFactory, DialogNames } from './dialog-factory';

type isReuseComponentApi = (controlId: string) => boolean;

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
    isReuseComponent: isReuseComponentApi,
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
    isReuseComponent: isReuseComponentApi,
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
 * @returns {boolean} True if the fragment command is enabled, false otherwise.
 */
export const isFragmentCommandEnabled = (overlays: ElementOverlay[], isReuseComponent: isReuseComponentApi): boolean => {
    if (overlays.length === 0 || overlays.length > 1) {
        return false;
    }

    const control = overlays[0].getElement();

    return hasStableId(overlays[0]) && !isReuseComponent(control.getId());
};

/**
 * Determines the text that should be displayed for the Add Fragment context menu item.
 *
 * @param {ElementOverlay} overlay - An ElementOverlay object representing the UI overlay.
 * @returns {string} The text of the Add Fragment context menu item.
 */
export const getAddFragmentItemText = (overlay: ElementOverlay) => {
    if (!hasStableId(overlay)) {
        return 'Add: Fragment (Unavailable due to unstable ID of the control or its parent control)';
    }

    return 'Add: Fragment';
};

/**
 * Adds a new item to the context menu
 *
 * @param rta Runtime Authoring
 * @param syncViewsIds Ids of all application sync views
 * @param ui5VersionInfo UI5 version information
 */
export const initDialogs = async (rta: RuntimeAuthoring, syncViewsIds: string[], ui5VersionInfo: Ui5VersionInfo): Promise<void> => {
    const contextMenu = rta.getDefaultPlugins().contextMenu;
    const isCloud = rta.getFlexSettings().isCloud;

    const isReuseComponentApi = await getReuseComponentChecker(ui5VersionInfo);

    contextMenu.addMenuItem({
        id: 'ADD_FRAGMENT',
        text: getAddFragmentItemText,
        handler: async (overlays: UI5Element[]) =>
            await DialogFactory.createDialog(overlays[0], rta, DialogNames.ADD_FRAGMENT),
        icon: 'sap-icon://attachment-html',
        enabled: (overlays: ElementOverlay[]) => isFragmentCommandEnabled(overlays, isReuseComponentApi)
    });

    contextMenu.addMenuItem({
        id: 'EXTEND_CONTROLLER',
        text: 'Extend With Controller',
        handler: async (overlays: UI5Element[]) =>
            await DialogFactory.createDialog(overlays[0], rta, DialogNames.CONTROLLER_EXTENSION),
        icon: 'sap-icon://create-form',
        enabled: (overlays: ElementOverlay[]) => isControllerExtensionEnabled(overlays, syncViewsIds, isReuseComponentApi, isCloud)
    });
};

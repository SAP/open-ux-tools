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
import { getTextBundle, type TextBundle } from '../i18n';
import { getReuseComponentChecker } from './utils';
import type { Ui5VersionInfo } from '../utils/version';
import { getSyncViewIds } from './sync-views-utils';

/**
 * Handler for enablement of Extend With Controller context menu entry
 *
 * @param control UI5 control.
 * @param isReuseComponent Function to check if the control is a reuse component.
 * @param isCloud Whether the application is running in the cloud
 *
 * @returns boolean whether menu item is enabled or not
 */
export function isControllerExtensionEnabledForControl(
    control: ManagedObject,
    isReuseComponent: IsReuseComponentApi,
    isCloud: boolean
): boolean {
    const viewId = FlUtils.getViewForControl(control).getId();
    const syncViewsIds = getSyncViewIds();
    const isControlInSyncView = syncViewsIds.has(viewId);

    if (isCloud) {
        const isClickedControlReuseComponent = isReuseComponent(control.getId());
        return !isControlInSyncView && !isClickedControlReuseComponent;
    }
    return !isControlInSyncView;
}

/**
 * Handler for enablement of Extend With Controller context menu entry
 *
 * @param overlays Control overlays
 * @param isReuseComponent Function to check if the control is a reuse component.
 * @param isCloud Whether the application is running in the cloud
 *
 * @returns boolean whether menu item is enabled or not
 */
export const isControllerExtensionEnabled = (
    overlays: ElementOverlay[],
    isReuseComponent: IsReuseComponentApi,
    isCloud: boolean
): boolean => {
    if (overlays.length === 0 || overlays.length > 1) {
        return false;
    }
    return isControllerExtensionEnabledForControl(overlays[0].getElement(), isReuseComponent, isCloud);
};

/**
 * Determines whether the fragment command should be enabled based on the provided overlays.
 *
 * @param {ElementOverlay[]} overlays - An array of ElementOverlay objects representing the UI overlays.
 * @param {isReuseComponentApi} isReuseComponent - Function to check if the control is a reuse component.
 * @param {boolean} isCloud - Whether the application is running in the cloud.
 * @returns {boolean} True if the fragment command is enabled, false otherwise.
 */
export const isFragmentCommandEnabled = (
    overlays: ElementOverlay[],
    isReuseComponent: IsReuseComponentApi,
    isCloud: boolean
): boolean => {
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
 * @param {TextBundle} resources - The text bundle.
 * @returns {string} The text of the Add Fragment context menu item.
 */
export const getAddFragmentItemText = (
    overlay: ElementOverlay,
    isReuseComponentChecker: IsReuseComponentApi,
    isCloud: boolean,
    resources: TextBundle
) => {
    if (isCloud && isReuseComponentChecker(overlay.getElement().getId())) {
        return resources.getText('ADP_ADD_FRAGMENT_MENU_ITEM_REUSE_COMPONENT');
    }
    if (!hasStableId(overlay)) {
        return resources.getText('ADP_ADD_FRAGMENT_MENU_ITEM_UNSTABLE_ID');
    }

    return resources.getText('ADP_ADD_FRAGMENT_MENU_ITEM');
};

/**
 * Determines the text that should be displayed for Controller Extension context menu item.
 *
 * @param {ElementOverlay} overlay - An ElementOverlay object representing the UI overlay.
 * @param {isReuseComponentApi} isReuseComponentChecker - Function to check if the control is a reuse component.
 * @param {boolean} isCloud - Whether the application is running in the cloud.
 * @param {TextBundle} resources - The text bundle.
 * @returns {string} The text of the Add Fragment context menu item.
 */
export const getExtendControllerItemText = (
    overlay: ElementOverlay,
    isReuseComponentChecker: IsReuseComponentApi,
    isCloud: boolean,
    resources: TextBundle
) => {
    const viewId = FlUtils.getViewForControl(overlay.getElement()).getId();
    const syncViewsIds = getSyncViewIds();
    if (syncViewsIds.has(viewId)) {
        return resources.getText('ADP_ADD_CONTROLLER_EXTENSION_MENU_ITEM_SYNC_VIEW');
    }

    if (isCloud && isReuseComponentChecker(overlay.getElement().getId())) {
        return resources.getText('ADP_ADD_CONTROLLER_EXTENSION_MENU_ITEM_REUSE_COMPONENT');
    }

    return resources.getText('ADP_ADD_CONTROLLER_EXTENSION_MENU_ITEM');
};

/**
 * Adds a new item to the context menu
 *
 * @param rta Runtime Authoring
 * @param ui5VersionInfo UI5 version information
 */
export const initDialogs = async (
    rta: RuntimeAuthoring,
    ui5VersionInfo: Ui5VersionInfo
): Promise<void> => {
    const contextMenu = rta.getDefaultPlugins().contextMenu;
    const isCloud = rta.getFlexSettings().isCloud;
    const resources = await getTextBundle();
    const isReuseComponentChecker = await getReuseComponentChecker(ui5VersionInfo);

    contextMenu.addMenuItem({
        id: 'ADD_FRAGMENT',
        text: (overlay: ElementOverlay) => getAddFragmentItemText(overlay, isReuseComponentChecker, isCloud, resources),
        handler: async (overlays: UI5Element[]) =>
            await DialogFactory.createDialog(overlays[0], rta, DialogNames.ADD_FRAGMENT),
        icon: 'sap-icon://attachment-html',
        enabled: (overlays: ElementOverlay[]) => isFragmentCommandEnabled(overlays, isReuseComponentChecker, isCloud)
    });

    contextMenu.addMenuItem({
        id: 'EXTEND_CONTROLLER',
        text: (overlay: ElementOverlay) =>
            getExtendControllerItemText(overlay, isReuseComponentChecker, isCloud, resources),
        handler: async (overlays: UI5Element[]) =>
            await DialogFactory.createDialog(overlays[0], rta, DialogNames.CONTROLLER_EXTENSION),
        icon: 'sap-icon://create-form',
        enabled: (overlays: ElementOverlay[]) =>
            isControllerExtensionEnabled(overlays, isReuseComponentChecker, isCloud)
    });
};

/** sap.m */
import type Dialog from 'sap/m/Dialog';

/** sap.ui.core */
import Fragment from 'sap/ui/core/Fragment';
import UI5Element from 'sap/ui/core/Element';

/** sap.ui.rta */
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

/** sap.ui.fl */
import FlUtils from 'sap/ui/fl/Utils';

/** sap.ui.dt */
import type ElementOverlay from 'sap/ui/dt/ElementOverlay';

import AddFragment, { AddFragmentOptions } from './controllers/AddFragment.controller';
import ControllerExtension from './controllers/ControllerExtension.controller';
import { ExtensionPointData } from './extension-point';
import ExtensionPoint from './controllers/ExtensionPoint.controller';
import ManagedObject from 'sap/ui/base/ManagedObject';
import { isReuseComponent } from '../cpe/utils';
import { Ui5VersionInfo } from '../utils/version';
import { getTextBundle } from '../i18n';

export const enum DialogNames {
    ADD_FRAGMENT = 'AddFragment',
    CONTROLLER_EXTENSION = 'ControllerExtension',
    ADD_FRAGMENT_AT_EXTENSION_POINT = 'ExtensionPoint'
}

type Controller = AddFragment | ControllerExtension | ExtensionPoint;

/**
 * Handler for enablement of Extend With Controller context menu entry
 *
 * @param control UI5 control.
 * @param syncViewsIds Runtime Authoring
 * @param ui5VersionInfo UI5 version information
 *
 * @returns boolean whether menu item is enabled or not
 */
export function isControllerExtensionEnabledForControl(
    control: ManagedObject,
    syncViewsIds: string[],
    ui5VersionInfo: Ui5VersionInfo
): boolean {
    const clickedControlId = FlUtils.getViewForControl(control).getId();
    const isClickedControlReuseComponent = isReuseComponent(clickedControlId, ui5VersionInfo);

    return !syncViewsIds.includes(clickedControlId) && !isClickedControlReuseComponent;
}

/**
 * Handler for enablement of Extend With Controller context menu entry
 *
 * @param overlays Control overlays
 * @param syncViewsIds Runtime Authoring
 * @param ui5VersionInfo UI5 version information
 *
 * @returns boolean whether menu item is enabled or not
 */
export const isControllerExtensionEnabled = (
    overlays: ElementOverlay[],
    syncViewsIds: string[],
    ui5VersionInfo: Ui5VersionInfo
): boolean => {
    if (overlays.length === 0 || overlays.length > 1) {
        return false;
    }
    return isControllerExtensionEnabledForControl(overlays[0].getElement(), syncViewsIds, ui5VersionInfo);
};

/**
 * Determines whether the fragment command should be enabled based on the provided overlays.
 *
 * @param {ElementOverlay[]} overlays - An array of ElementOverlay objects representing the UI overlays.
 * @param ui5VersionInfo UI5 version information
 * @returns {boolean} True if the fragment command is enabled, false otherwise.
 */
export const isFragmentCommandEnabled = (overlays: ElementOverlay[], ui5VersionInfo: Ui5VersionInfo): boolean => {
    if (overlays.length === 0 || overlays.length > 1) {
        return false;
    }

    const control = overlays[0].getElement();

    return hasStableId(control) && !isReuseComponent(control.getId(), ui5VersionInfo);
};

/**
 * Determines whether control has stable id
 * @param {ManagedObject} control - ManagedObject object representing the UI control.
 * @returns {boolean} True if control has stable Id, false otherwise
 */
const hasStableId = (control: ManagedObject): boolean => {
    return FlUtils.checkControlId(control);
};

/**
 * Determines the text that should be displayed for the Add Fragment context menu item.
 *
 * @param {ElementOverlay} overlay - An ElementOverlay object representing the UI overlay.
 * @returns {string} The text of the Add Fragment context menu item.
 */
export const getAddFragmentItemText = (overlay: ElementOverlay) => {
    const control = overlay.getElement();
    if (control && !hasStableId(control)) {
        return 'Add: Fragment (Unavailable due to unstable ID of the control or its parent control)';
    }

    return 'Add: Fragment';
};

/**
 * Handler for new context menu entry
 *
 * @param overlay Control overlays
 * @param rta Runtime Authoring
 * @param dialogName Dialog name
 * @param extensionPointData Control ID
 * @param options Dialog options
 */
export async function handler(
    overlay: UI5Element,
    rta: RuntimeAuthoring,
    dialogName: DialogNames,
    extensionPointData?: ExtensionPointData,
    options: Partial<AddFragmentOptions> = {}
): Promise<void> {
    let controller: Controller;
    const resources = await getTextBundle();

    switch (dialogName) {
        case DialogNames.ADD_FRAGMENT:
            controller = new AddFragment(`open.ux.preview.client.adp.controllers.${dialogName}`, overlay, rta, {
                aggregation: options.aggregation,
                title: resources.getText(options.title ?? 'ADP_ADD_FRAGMENT_DIALOG_TITLE')
            });
            break;
        case DialogNames.CONTROLLER_EXTENSION:
            controller = new ControllerExtension(`open.ux.preview.client.adp.controllers.${dialogName}`, overlay, rta);
            break;
        case DialogNames.ADD_FRAGMENT_AT_EXTENSION_POINT:
            controller = new ExtensionPoint(
                `open.ux.preview.client.adp.controllers.${dialogName}`,
                overlay,
                rta,
                extensionPointData!
            );
            break;
    }

    const id = dialogName === DialogNames.ADD_FRAGMENT_AT_EXTENSION_POINT ? `dialog--${dialogName}` : undefined;

    const dialog = await Fragment.load({
        name: `open.ux.preview.client.adp.ui.${dialogName}`,
        controller,
        id
    });

    await controller.setup(dialog as Dialog);
}

/**
 * Adds a new item to the context menu
 *
 * @param rta Runtime Authoring
 * @param syncViewsIds Ids of all application sync views
 * @param ui5VersionInfo UI5 version information
 */
export const initDialogs = (rta: RuntimeAuthoring, syncViewsIds: string[], ui5VersionInfo: Ui5VersionInfo): void => {
    const contextMenu = rta.getDefaultPlugins().contextMenu;

    contextMenu.addMenuItem({
        id: 'ADD_FRAGMENT',
        text: getAddFragmentItemText,
        handler: async (overlays: UI5Element[]) => await handler(overlays[0], rta, DialogNames.ADD_FRAGMENT),
        icon: 'sap-icon://attachment-html',
        enabled: (overlays: ElementOverlay[]) => isFragmentCommandEnabled(overlays, ui5VersionInfo)
    });

    contextMenu.addMenuItem({
        id: 'EXTEND_CONTROLLER',
        text: 'Extend With Controller',
        handler: async (overlays: UI5Element[]) => await handler(overlays[0], rta, DialogNames.CONTROLLER_EXTENSION),
        icon: 'sap-icon://create-form',
        enabled: (overlays: ElementOverlay[]) => isControllerExtensionEnabled(overlays, syncViewsIds, ui5VersionInfo)
    });
};

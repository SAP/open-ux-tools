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

import AddFragment from './controllers/AddFragment.controller';
import ControllerExtension from './controllers/ControllerExtension.controller';
import { ExtensionPointData } from './extension-point';
import ExtensionPoint from './controllers/ExtensionPoint.controller';
import { Manifest } from 'sap/ui/rta/RuntimeAuthoring';

export const enum DialogNames {
    ADD_FRAGMENT = 'AddFragment',
    CONTROLLER_EXTENSION = 'ControllerExtension',
    ADD_FRAGMENT_AT_EXTENSION_POINT = 'ExtensionPoint'
}

type Controller = AddFragment | ControllerExtension | ExtensionPoint;

/**
 * Adds a new item to the context menu
 *
 * @param rta Runtime Authoring
 * @param syncViewsIds Ids of all application sync views
 */
export const initDialogs = (rta: RuntimeAuthoring, syncViewsIds: string[]): void => {
    const contextMenu = rta.getDefaultPlugins().contextMenu;

    contextMenu.addMenuItem({
        id: 'ADD_FRAGMENT',
        text: 'Add: Fragment',
        handler: async (overlays: UI5Element[]) => await handler(overlays[0], rta, DialogNames.ADD_FRAGMENT),
        icon: 'sap-icon://attachment-html',
        enabled: isFragmentCommandEnabled
    });

    contextMenu.addMenuItem({
        id: 'EXTEND_CONTROLLER',
        text: 'Extend With Controller',
        handler: async (overlays: UI5Element[]) => await handler(overlays[0], rta, DialogNames.CONTROLLER_EXTENSION),
        icon: 'sap-icon://create-form',
        enabled: (overlays: ElementOverlay[]) => isControllerExtensionEnabled(overlays, syncViewsIds)
    });
};

/**
 * Handler for enablement of Extend With Controller context menu entry
 *
 * @param overlays Control overlays
 * @param syncViewsIds Runtime Authoring
 *
 * @returns boolean whether menu item is enabled or not
 */
export const isControllerExtensionEnabled = (overlays: ElementOverlay[], syncViewsIds: string[]): boolean => {
    if (overlays.length === 0 || overlays.length > 1) return false;

    const clickedControlId = FlUtils.getViewForControl(overlays[0].getElement()).getId();
    const isClickedControlReuseComponent = isReuseComponent(clickedControlId);

    return !syncViewsIds.includes(clickedControlId) && !isClickedControlReuseComponent;
}

/**
 * Function that checks if clicked control is from view that uses reused component
 *
 * @param clickedControlId id of the clicked control
 * @returns boolean if clicked control is from reused component
 */
export const isReuseComponent = (clickedControlId: string): boolean => {
    const version = sap.ui.version;
    const minor = parseInt(version.split('.')[1], 10);
    if (minor < 114) {
        return false;
    }

    const Component = sap.ui.require('sap/ui/core/Component');
    const component = Component.getComponentById(clickedControlId);
    if (!component) {
        return false;
    }

    const manifest = component.getManifest() as Manifest;

    if(!manifest) {
        return false;
    }

    return manifest['sap.app'].type === 'component';
};

/**
 * Determines whether the fragment command should be enabled based on the provided overlays.
 *
 * @param {ElementOverlay[]} overlays - An array of ElementOverlay objects representing the UI overlays.
 * @returns {boolean} True if the fragment command is enabled, false otherwise.
 */
export const isFragmentCommandEnabled = (overlays: ElementOverlay[]): boolean => {
    if (overlays.length === 0 || overlays.length > 1) return false;

    const control = overlays[0].getElement();
    const hasStableId = FlUtils.checkControlId(control);

    return hasStableId && !isReuseComponent(control.getId());
};

/**
 * Handler for new context menu entry
 *
 * @param overlay Control overlays
 * @param rta Runtime Authoring
 * @param dialogName Dialog name
 * @param extensionPointData Control ID
 */
export async function handler(
    overlay: UI5Element,
    rta: RuntimeAuthoring,
    dialogName: DialogNames,
    extensionPointData?: ExtensionPointData
): Promise<void> {
    let controller: Controller;

    switch (dialogName) {
        case DialogNames.ADD_FRAGMENT:
            controller = new AddFragment(`open.ux.preview.client.adp.controllers.${dialogName}`, overlay, rta);
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

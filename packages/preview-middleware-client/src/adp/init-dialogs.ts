/** sap.m */
import type Dialog from 'sap/m/Dialog';

/** sap.ui.core */
import Fragment from 'sap/ui/core/Fragment';
import UI5Element from 'sap/ui/core/Element';

/** sap.ui.rta */
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

/** sap.ui.fl */
import FlUtils from 'sap/ui/fl/Utils';

import ElementOverlay from 'sap/ui/dt/ElementOverlay';

import AddFragment from './controllers/AddFragment.controller';
import ControllerExtension from './controllers/ControllerExtension.controller';
import { ExtensionPointData } from './extension-point';
import ExtensionPoint from './controllers/ExtensionPoint.controller';
import Component from 'sap/ui/core/Component';
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
        enabled: (overlays: ElementOverlay[]) => isAddFragmentEnabled(overlays)
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
 * Handler for enablement of Add Fragment context menu entry
 *
 * @param overlays Control overlays
 *
 * @returns boolean whether menu item is enabled or not
 */
export const isAddFragmentEnabled = (overlays: ElementOverlay[]): boolean => {
    const clickedControlId = FlUtils.getViewForControl(overlays[0].getElement()).getId();

    return overlays.length <= 1 && !isReuseComponent(clickedControlId);
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
    const clickedControlId = FlUtils.getViewForControl(overlays[0].getElement()).getId();

    return overlays.length <= 1 && !syncViewsIds.includes(clickedControlId) && !isReuseComponent;
};

/**
 * Function that checks if clicked control is from view that uses reused component
 * 
 * @param clickedControlId id of the clicked control
 * @returns boolean if clicked control is from reused component
 */
const isReuseComponent = (clickedControlId: string): boolean => {
    const version = sap.ui.version;
    const minor = parseInt(version.split('.')[1], 10);
    const manifest = Component.getComponentById(clickedControlId)?.getManifest() as Manifest;
    const isReuseComponent = manifest['sap.app']?.type === 'component' && minor >= 114;
    
    return isReuseComponent;
}

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

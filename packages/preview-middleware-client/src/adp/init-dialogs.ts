/** sap.ui.core */
import XMLView from 'sap/ui/core/mvc/XMLView';
import type UI5Element from 'sap/ui/core/Element';

/** sap.ui.rta */
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

import AddFragment from './controllers/AddFragment.controller';
import ControllerExtension from './controllers/ControllerExtension.controller';

export const enum DialogNames {
    ADD_FRAGMENT = 'AddFragment',
    CONTROLLER_EXTENSION = 'ControllerExtension'
}

/**
 * Adds a new item to the context menu
 *
 * @param rta Runtime Authoring
 */
export const initDialogs = (rta: RuntimeAuthoring): void => {
    const contextMenu = rta.getDefaultPlugins().contextMenu;

    contextMenu.addMenuItem({
        id: 'ADD_FRAGMENT',
        text: 'Add: Fragment',
        handler: async (overlays: UI5Element[]) => await handler(overlays[0], rta, DialogNames.ADD_FRAGMENT),
        icon: 'sap-icon://attachment-html'
    });

    contextMenu.addMenuItem({
        id: 'EXTEND_CONTROLLER',
        text: 'Extend With Controller',
        handler: async (overlays: UI5Element[]) => await handler(overlays[0], rta, DialogNames.CONTROLLER_EXTENSION),
        icon: 'sap-icon://create-form'
    });
};

/**
 * Handler for new context menu entry
 *
 * @param overlays Control overlays
 * @param rta Runtime Authoring
 * @param dialogName Dialog name
 */
export async function handler(overlays: UI5Element, rta: RuntimeAuthoring, dialogName: DialogNames): Promise<void> {
    const controller =
        dialogName === DialogNames.ADD_FRAGMENT
            ? new AddFragment(`open.ux.preview.client.adp.controllers.${dialogName}`, overlays, rta)
            : new ControllerExtension(`open.ux.preview.client.adp.controllers.${dialogName}`, overlays, rta);

    await XMLView.create({
        viewName: `open.ux.preview.client.adp.ui.${dialogName}`,
        controller
    });
}

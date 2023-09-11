/** sap.ui.core */
import XMLView from 'sap/ui/core/mvc/XMLView';
import type UI5Element from 'sap/ui/core/Element';
import Controller from 'sap/ui/core/mvc/Controller';

/** sap.ui.rta */
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

import type AddFragment from '../controllers/AddFragment.controller';

/**
 * Initilizes "Add XML Fragment" functionality and adds a new item to the context menu
 *
 * @param rta Runtime Authoring
 */
export const initController = (rta: RuntimeAuthoring): void => {
    const contextMenu = rta.getDefaultPlugins().contextMenu;

    contextMenu.addMenuItem({
        id: 'EXTEND_CONTROLLER',
        text: 'Extend With Controller',
        handler: async () => await controllerHandler(rta),
        icon: 'sap-icon://create-form'
    });
};

/**
 * Handler for new context menu entry
 *
 * @param rta Runtime Authoring
 */
export async function controllerHandler(rta: RuntimeAuthoring): Promise<void> {
    const viewXml = '<mvc:View xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m"></mvc:View>';

    const controller = (await Controller.create({
        name: 'open.ux.preview.client.adp.controllers.ExtendController'
    })) as unknown as AddFragment;

    controller.rta = rta;

    await XMLView.create({
        definition: viewXml,
        controller
    });
}

/** sap.ui.core */
import XMLView from 'sap/ui/core/mvc/XMLView';
import type UI5Element from 'sap/ui/core/Element';
import Controller from 'sap/ui/core/mvc/Controller';

/** sap.ui.rta */
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

import type ExtendController from '../controllers/ExtendController.controller';

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
        handler: async (overlays: UI5Element[]) => await controllerHandler(overlays, rta),
        icon: 'sap-icon://create-form'
    });
};

/**
 * Handler for new context menu entry
 *
 * @param overlays Control overlays
 * @param rta Runtime Authoring
 */
export async function controllerHandler(overlays: UI5Element[], rta: RuntimeAuthoring): Promise<void> {
    const viewXml = '<mvc:View xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m"></mvc:View>';

    const controller = (await Controller.create({
        name: 'open.ux.preview.client.adp.controllers.ExtendController'
    })) as unknown as ExtendController;

    controller.rta = rta;
    controller.overlays = overlays;

    await XMLView.create({
        definition: viewXml,
        controller
    });
}

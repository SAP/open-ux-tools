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
export const initFragment = (rta: RuntimeAuthoring): void => {
    const contextMenu = rta.getDefaultPlugins().contextMenu;

    contextMenu.addMenuItem({
        id: 'ADD_FRAGMENT',
        text: 'Add: Fragment',
        handler: async (overlays: UI5Element[]) => await handler(overlays, rta),
        icon: 'sap-icon://attachment-html'
    });
};

/**
 * Handler for new context menu entry
 *
 * @param overlays Control overlays
 * @param rta Runtime Authoring
 */
export async function handler(overlays: UI5Element[], rta: RuntimeAuthoring): Promise<void> {
    const controller = (await Controller.create({
        name: 'open.ux.preview.client.adp.controllers.AddFragment'
    })) as unknown as AddFragment;

    controller.overlays = overlays;
    controller.rta = rta;

    await XMLView.create({
        definition: `<mvc:View xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m" xmlns:core="sap.ui.core">
            <core:Fragment fragmentName="open.ux.preview.client.adp.ui.AddFragment" type="XML" />
        </mvc:View>`,
        controller
    });
}

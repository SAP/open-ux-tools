/** sap.ui.core */
import XMLView from 'sap/ui/core/mvc/XMLView';
import type UI5Element from 'sap/ui/core/Element';
import Controller from 'sap/ui/core/mvc/Controller';

/** sap.ui.rta */
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

/** sap.ui.dt */
import type ContextMenu from 'sap/ui/dt/plugin/ContextMenu';

import type AddFragment from '../controllers/AddFragment.controller';
import type { BaseDialog } from './base';

/**
 * Handles creation of the dialog, fills it with data
 */
export default class FragmentDialog implements BaseDialog {
    /**
     * @param rta Runtime Authoring
     */
    constructor(private rta: RuntimeAuthoring) {}

    /**
     * Initilizes "Add XML Fragment" functionality and adds a new item to the context menu
     *
     * @param contextMenu Context Menu from RTA
     */
    public init(contextMenu: ContextMenu): void {
        contextMenu.addMenuItem({
            id: 'ADD_FRAGMENT',
            text: 'Add: Fragment',
            handler: async function (this: FragmentDialog, overlays: UI5Element[]) {
                const viewXml = '<mvc:View xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m"></mvc:View>';

                const controller = (await Controller.create({
                    name: 'adp.extension.controllers.AddFragment'
                })) as unknown as AddFragment;

                controller.overlays = overlays;
                controller.rta = this.rta;

                await XMLView.create({
                    definition: viewXml,
                    controller
                });
            }.bind(this),
            icon: 'sap-icon://attachment-html'
        });
    }
}

/** sap.m */
import type Button from 'sap/m/Button';
import type Select from 'sap/m/Select';
import type Dialog from 'sap/m/Dialog';
import MessageToast from 'sap/m/MessageToast';

/** sap.ui.core */
import type UI5Element from 'sap/ui/core/Element';

/** sap.ui.base */
import type Event from 'sap/ui/base/Event';

/** sap.ui.model */
import JSONModel from 'sap/ui/model/json/JSONModel';

/** sap.ui.rta */
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

import { getFragments } from '../api-handler';
import BaseDialog from './BaseDialog.controller';
import { ExtensionPointData, ExtensionPointInfo } from '../extension-point';
import { notifyUser } from '../utils';

/**
 * @namespace open.ux.preview.client.adp.controllers
 */
export default class ExtensionPoint extends BaseDialog {
    public readonly data: ExtensionPointData;

    constructor(name: string, _overlays: UI5Element, rta: RuntimeAuthoring, data: ExtensionPointData) {
        super(name);
        this.model = new JSONModel();
        this.data = data;
        this.rta = rta;
    }

    /**
     * Setups the Dialog and the JSON Model
     *
     * @param {Dialog} dialog - Dialog instance
     */
    async setup(dialog: Dialog): Promise<void> {
        this.dialog = dialog;

        this.setEscapeHandler();

        await this.buildDialogData();

        this.dialog.setModel(this.model);

        this.dialog.open();
    }

    /**
     * Handles create button press
     *
     * @param event Event
     */
    onCreateBtnPress(event: Event): void {
        const source = event.getSource<Button>();
        source.setEnabled(false);

        const fragmentName = this.model.getProperty('/newFragmentName');

        this.createExtensionPointFragmentChange(fragmentName);

        notifyUser(`Note: The '${fragmentName}.fragment.xml' fragment will be created once you save the change.`, 8000);

        this.handleDialogClose();
    }

    /**
     * Handler for extension point select control
     *
     * @param event Select control change event
     */
    onExtensionPointHandler(event: Event): void {
        const source = event.getSource<Select>();

        const selectedItem = source.getSelectedItem();

        let extensionPointName = '';
        if (selectedItem) {
            extensionPointName = selectedItem.getText();
        }

        this.model.setProperty('/extensionPointName', extensionPointName);
    }

    /**
     * Builds data that is used in the dialog
     */
    async buildDialogData(): Promise<void> {
        const name = this.data?.name;
        if (name) {
            const extensionPointList = [{ key: 0, value: name }];
            this.updateModel(name, 0, extensionPointList, false);
        } else {
            const extensionPointList = this.data.info.map((v: ExtensionPointInfo, idx: number) => {
                return {
                    key: idx,
                    value: v.name
                };
            });
            const enabled = extensionPointList.length > 1;
            this.updateModel(extensionPointList[0].value, 0, extensionPointList, enabled);
        }

        try {
            const { fragments } = await getFragments();

            this.model.setProperty('/fragmentList', fragments);
        } catch (e) {
            MessageToast.show(e.message);
            throw new Error(e.message);
        }
    }

    /**
     * Updates the Select control according to provided values
     *
     * @param name Extension point name
     * @param key Selected extension point key
     * @param list All of the extension points that are under a view
     * @param enabled Enables the select control
     */
    private updateModel(name: string, key: number, list: { key: number; value: string }[], enabled: boolean): void {
        this.model.setProperty('/extensionPointName', name);
        this.model.setProperty('/extensionPointKey', key);
        this.model.setProperty('/extensionPointList', list);
        this.model.setProperty('/extensionListEnabled', enabled);
    }

    /**
     * Creates add xml at extension point changes
     *
     * @param fragmentName Fragment name
     */
    private createExtensionPointFragmentChange(fragmentName: string): void {
        const extensionPointName = this.model.getProperty('/extensionPointName');
        const modifiedValue = {
            fragment: `<core:FragmentDefinition xmlns:core='sap.ui.core'></core:FragmentDefinition>`,
            fragmentPath: `fragments/${fragmentName}.fragment.xml`,
            extensionPointName
        };

        this.data.deferred.resolve(modifiedValue);
    }
}

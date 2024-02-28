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

import { getFragments, writeFragment } from '../api-handler';
import BaseDialog from './BaseDialog.controller';
import { ExtensionPointData, ExtensionPointInfo } from '../extension-point';

/**
 * @namespace open.ux.preview.client.adp.controllers
 */
export default class ExtensionPoint extends BaseDialog {
    public readonly data: ExtensionPointData;

    constructor(name: string, _overlays: UI5Element, _rta: RuntimeAuthoring, data: ExtensionPointData) {
        super(name);
        this.model = new JSONModel();
        this.data = data;
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
    async onCreateBtnPress(event: Event): Promise<void> {
        const source = event.getSource<Button>();
        source.setEnabled(false);

        const fragmentName = this.model.getProperty('/newFragmentName');

        await this.createNewFragment(fragmentName);

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
     * Creates a new fragment for the specified extension point
     *
     * @param fragmentName Fragment name
     */
    private async createNewFragment(fragmentName: string): Promise<void> {
        try {
            await writeFragment<unknown>({ fragmentName });
            MessageToast.show(`Fragment with name '${fragmentName}' was created.`);
        } catch (e) {
            // In case of error when creating a new fragment, we should not create a change file
            MessageToast.show(e.message);
            throw new Error(e.message);
        }

        await this.createExtensionPointFragmentChange(fragmentName);
    }

    /**
     * Creates add xml at extension point changes
     *
     * @param fragmentName Fragment name
     */
    private async createExtensionPointFragmentChange(fragmentName: string): Promise<void> {
        const extensionPointName = this.model.getProperty('/extensionPointName');
        const modifiedValue = {
            fragmentPath: `fragments/${fragmentName}.fragment.xml`,
            extensionPointName
        };

        this.data.deferred.resolve(modifiedValue);
    }
}

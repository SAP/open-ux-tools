/** sap.m */
import Button from 'sap/m/Button';
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

import type ElementOverlay from 'sap/ui/dt/ElementOverlay';

import CommandExecutor from '../command-executor';
import { getFragments, writeFragment } from '../api-handler';
import BaseDialog from './BaseDialog.controller';
import { ExtensionPointData } from '../extension-point';

/**
 * @namespace open.ux.preview.client.adp.controllers
 */
export default class ExtensionPoint extends BaseDialog {
    public readonly extensionPointData: ExtensionPointData | undefined;
    public isFromOutlineTree: boolean;

    constructor(name: string, overlays: UI5Element, rta: RuntimeAuthoring, extensionPointData?: ExtensionPointData) {
        super(name);
        this.rta = rta;
        this.overlays = overlays;
        this.model = new JSONModel();
        this.extensionPointData = extensionPointData;
        this.commandExecutor = new CommandExecutor(this.rta);
    }

    /**
     * Initializes controller, fills model with data and opens the dialog
     */
    async onInit() {
        this.dialog = this.byId('addFragmentAtExtPointDialog') as unknown as Dialog;
        this.isFromOutlineTree = this.extensionPointData?.controlType === 'extensionPoint';

        await this.buildDialogData();

        this.getView()?.setModel(this.model);

        this.dialog.open();
    }

    /**
     * Handles create button press
     *
     * @param event Event
     */
    async onCreateBtnPress(event: Event) {
        const source = event.getSource<Button>();
        source.setEnabled(false);

        const fragmentName = this.model.getProperty('/newFragmentName');

        await this.createNewFragment(fragmentName);

        this.handleDialogClose();
    }

    /**
     * Builds data that is used in the dialog
     *
     * @param controlId Control ID
     */
    async buildDialogData(): Promise<void> {
        const selectorId = this.extensionPointData?.controlId ?? this.overlays.getId();

        const overlayControl = sap.ui.getCore().byId(selectorId) as unknown as ElementOverlay;
        this.runtimeControl = this.isFromOutlineTree ? overlayControl : overlayControl.getElement();

        this.model.setProperty('/extensionPointName', this.extensionPointData?.name);

        try {
            const { fragments } = await getFragments();

            this.model.setProperty('/fragmentList', fragments);
        } catch (e) {
            throw new Error(e.message);
        }
    }

    /**
     * Creates a new fragment for the specified control
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

        await this.createFragmentChange(fragmentName);
    }

    /**
     * Creates an addXML fragment command and pushes it to the command stack
     *
     * @param fragmentName Fragment name
     */
    private async createFragmentChange(fragmentName: string) {
        // const flexSettings = this.rta.getFlexSettings();

        // const overlay = OverlayRegistry.getOverlay(this.runtimeControl as UI5Element);
        // const designMetadata = overlay.getDesignTimeMetadata();

        const modifiedValue = {
            fragmentPath: `fragments/${fragmentName}.fragment.xml`,
            extensionPointName: this.extensionPointData?.name
        };

        this.extensionPointData?.deffered?.resolve(modifiedValue);

        // await this.commandExecutor.generateAndExecuteCommand(
        //     this.runtimeControl,
        //     'addXMLAtExtensionPoint',
        //     modifiedValue,
        //     designMetadata,
        //     flexSettings
        // );
    }
}

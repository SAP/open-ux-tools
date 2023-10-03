/** sap.m */
import Input from 'sap/m/Input';
import Button from 'sap/m/Button';
import type Dialog from 'sap/m/Dialog';
import MessageToast from 'sap/m/MessageToast';

/** sap.ui.core */
import { ValueState } from 'sap/ui/core/library';
import type UI5Element from 'sap/ui/core/Element';

/** sap.ui.base */
import type Event from 'sap/ui/base/Event';

/** sap.ui.model */
import JSONModel from 'sap/ui/model/json/JSONModel';

/** sap.ui.rta */
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

/** sap.ui.fl */
import Utils from 'sap/ui/fl/Utils';

/** sap.ui.dt */
import type ElementOverlay from 'sap/ui/dt/ElementOverlay';

import type { ControllersResponse } from '../api-handler';
import { getManifestAppdescr, readControllers, writeChange, writeController } from '../api-handler';
import BaseDialog from './BaseDialog.controller';

interface ControllerExtensionService {
    add: (codeRef: string, viewId: string) => Promise<unknown>;
}

/**
 * @namespace open.ux.preview.client.adp.controllers
 */
export default class ControllerExtension extends BaseDialog {
    constructor(name: string, overlays: UI5Element, rta: RuntimeAuthoring) {
        super(name);
        this.rta = rta;
        this.overlays = overlays;
        this.model = new JSONModel();
    }

    /**
     * Initializes controller, fills model with data and opens the dialog
     */
    async onInit() {
        this.dialog = this.byId('controllerExtensionDialog') as unknown as Dialog;

        await this.buildDialogData();

        this.getView()?.setModel(this.model);

        this.dialog.open();
    }

    /**
     * Handles fragment name input change
     *
     * @param event Event
     */
    onControllerNameInputChange(event: Event) {
        const source = event.getSource<Input>();

        const controllerName: string = source.getValue().trim();
        const controllerList: { controllerName: string }[] = this.model.getProperty('/controllersList');

        if (controllerName.length <= 0) {
            this.dialog.getBeginButton().setEnabled(false);
            source.setValueState(ValueState.None);
            this.model.setProperty('/newControllerName', null);
        } else {
            const fileExists = controllerList.find((f: { controllerName: string }) => {
                return f.controllerName === `${controllerName}.js`;
            });

            const isValidName = /^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(controllerName);

            if (fileExists) {
                source.setValueState(ValueState.Error);
                source.setValueStateText(
                    'Enter a different name. The controller name that you entered already exists in your project.'
                );
                this.dialog.getBeginButton().setEnabled(false);
            } else if (!isValidName) {
                source.setValueState(ValueState.Error);
                source.setValueStateText('The controller name cannot contain white spaces or special characters.');
                this.dialog.getBeginButton().setEnabled(false);
            } else {
                this.dialog.getBeginButton().setEnabled(true);
                source.setValueState(ValueState.None);
                this.model.setProperty('/newControllerName', controllerName);
            }
        }
    }

    /**
     * Handles create button press
     *
     * @param event Event
     */
    async onCreateBtnPress(event: Event) {
        const source = event.getSource<Button>();
        source.setEnabled(false);

        const controllerName = this.model.getProperty('/newControllerName');
        const viewId = this.model.getProperty('/viewId');

        await this.createNewController(controllerName, viewId);

        this.handleDialogClose();
    }

    /**
     * Builds data that is used in the dialog
     */
    async buildDialogData(): Promise<void> {
        const selectorId = this.overlays.getId();
        const overlayControl = sap.ui.getCore().byId(selectorId) as unknown as ElementOverlay;
        const control = overlayControl.getElement();
        const viewId = Utils.getViewForControl(control).getId();

        this.model.setProperty('/viewId', viewId);

        await this.getControllers();
    }

    /**
     * Retrieves controller files and fills the model with data
     */
    async getControllers(): Promise<void> {
        try {
            const { controllers } = await readControllers<ControllersResponse>();
            this.model.setProperty('/controllersList', controllers);
        } catch (e) {
            MessageToast.show(e.message);
            throw new Error(e.message);
        }
    }

    /**
     * Creates a new fragment for the specified control
     *
     * @param controllerName Controller Name
     * @param viewId View Id
     */
    private async createNewController(controllerName: string, viewId: string): Promise<void> {
        try {
            const manifest = await getManifestAppdescr();
            await writeController({ controllerName, projectId: manifest.id });

            const controllerRef = {
                codeRef: `coding/${controllerName}.js`,
                viewId
            };

            const service = await this.rta.getService<ControllerExtensionService>('controllerExtension');

            const change = await service.add(controllerRef.codeRef, controllerRef.viewId);

            await writeChange(change);
            MessageToast.show(`Controller extension with name '${controllerName}' was created.`);
        } catch (e) {
            // We want to update the model incase we have already created a controller file but failed when creating a change file,
            // so when the user types the same controller name again he does not get 409 from the server, instead an error is shown in the UI
            await this.getControllers();
            MessageToast.show(e.message);
            throw new Error(e.message);
        }
    }
}

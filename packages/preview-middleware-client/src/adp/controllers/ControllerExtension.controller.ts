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

/** sap.ui.layout */
import type SimpleForm from 'sap/ui/layout/form/SimpleForm';

/** sap.ui.dt */
import type ElementOverlay from 'sap/ui/dt/ElementOverlay';

import type { CodeExtResponse, ControllersResponse } from '../api-handler';
import {
    getExistingController,
    getManifestAppdescr,
    readControllers,
    writeChange,
    writeController
} from '../api-handler';
import BaseDialog from './BaseDialog.controller';

interface ControllerExtensionService {
    add: (codeRef: string, viewId: string) => Promise<{ creation: string }>;
}

interface ControllerInfo {
    controllerName: string;
    viewId: string;
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
     * Handles fragment name input change
     *
     * @param event Event
     */
    onControllerNameInputChange(event: Event) {
        const input = event.getSource<Input>();
        const beginBtn = this.dialog.getBeginButton();

        const controllerName: string = input.getValue();
        const controllerList: { controllerName: string }[] = this.model.getProperty('/controllersList');

        const updateDialogState = (valueState: ValueState, valueStateText = '') => {
            input.setValueState(valueState).setValueStateText(valueStateText);
            beginBtn.setEnabled(valueState === ValueState.Success);
        };

        if (controllerName.length <= 0) {
            updateDialogState(ValueState.None);
            this.model.setProperty('/newControllerName', null);
            return;
        }

        const fileExists = controllerList.some((f) => f.controllerName === `${controllerName}.js`);

        if (fileExists) {
            updateDialogState(
                ValueState.Error,
                'Enter a different name. The controller name that you entered already exists in your project.'
            );
            return;
        }

        const isValidName = /^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(controllerName);

        if (!isValidName) {
            updateDialogState(
                ValueState.Error,
                'The controller name cannot contain white spaces or special characters.'
            );
            return;
        }

        if (controllerName.length > 64) {
            updateDialogState(ValueState.Error, 'A controller file name cannot contain more than 64 characters.');
            return;
        }

        updateDialogState(ValueState.Success);
        this.model.setProperty('/newControllerName', controllerName);
    }

    /**
     * Handles create button press
     *
     * @param event Event
     */
    async onCreateBtnPress(event: Event) {
        const source = event.getSource<Button>();
        const controllerExists = this.model.getProperty('/controllerExists');

        if (!controllerExists) {
            source.setEnabled(false);

            const controllerName = this.model.getProperty('/newControllerName');
            const viewId = this.model.getProperty('/viewId');

            await this.createNewController(controllerName, viewId);
        } else {
            const controllerPath = this.model.getProperty('/controllerPath');
            window.open(`vscode://file${controllerPath}`);
        }

        this.handleDialogClose();
    }

    /**
     * Builds data that is used in the dialog.
     */
    async buildDialogData(): Promise<void> {
        const selectorId = this.overlays.getId();
        const overlayControl = sap.ui.getCore().byId(selectorId) as unknown as ElementOverlay;

        const { controllerName, viewId } = this.getControllerInfo(overlayControl);

        const { controllerExists, controllerPath, controllerPathFromRoot, isRunningInBAS } =
            await this.getExistingController(controllerName);

        if (controllerExists) {
            this.updateModelForExistingController(
                controllerExists,
                controllerPath,
                controllerPathFromRoot,
                isRunningInBAS
            );
        } else {
            this.updateModelForNewController(viewId);

            await this.getControllers();
        }
    }

    /**
     * Gets controller name and view ID for the given overlay control.
     *
     * @param overlayControl The overlay control.
     * @returns The controller name and view ID.
     */
    private getControllerInfo(overlayControl: ElementOverlay): ControllerInfo {
        const control = overlayControl.getElement();
        const view = Utils.getViewForControl(control);
        const controllerName = view.getController().getMetadata().getName();
        const viewId = view.getId();
        return { controllerName, viewId };
    }

    /**
     * Updates the model properties for an existing controller.
     *
     * @param {boolean} controllerExists - Whether the controller exists.
     * @param {string} controllerPath - The controller path.
     * @param {string} controllerPathFromRoot - The controller path from the project root.
     * @param {boolean} isRunningInBAS - Whether the environment is BAS or VS Code.
     */
    private updateModelForExistingController(
        controllerExists: boolean,
        controllerPath: string,
        controllerPathFromRoot: string,
        isRunningInBAS: boolean
    ): void {
        this.model.setProperty('/controllerExists', controllerExists);
        this.model.setProperty('/controllerPath', controllerPath);
        this.model.setProperty('/controllerPathFromRoot', controllerPathFromRoot);

        const content = this.dialog.getContent();

        const form = content[0] as SimpleForm;
        form.setVisible(false);

        const messageForm = content[1] as SimpleForm;
        messageForm.setVisible(true);

        if (isRunningInBAS) {
            this.dialog.getBeginButton().setVisible(false);
        } else {
            this.dialog.getBeginButton().setText('Open in VS Code').setEnabled(true);
        }
        this.dialog.getEndButton().setText('Close');
    }

    /**
     * Updates the model property for a new controller.
     *
     * @param viewId The view ID
     */
    private updateModelForNewController(viewId: string): void {
        this.model.setProperty('/viewId', viewId);
    }

    /**
     * Retrieves existing controller data if found in the project's workspace.
     *
     * @param controllerName Controller name that exists in the view
     * @returns Returnsexisting controller data
     */
    private async getExistingController(controllerName: string): Promise<CodeExtResponse> {
        try {
            const data = await getExistingController(controllerName);
            return data;
        } catch (e) {
            MessageToast.show(e.message, { duration: 5000 });
            throw new Error(e.message);
        }
    }

    /**
     * Retrieves controller files and fills the model with data
     */
    async getControllers(): Promise<void> {
        try {
            const { controllers } = await readControllers<ControllersResponse>();
            this.model.setProperty('/controllersList', controllers);
        } catch (e) {
            MessageToast.show(e.message, { duration: 5000 });
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
            change.creation = new Date().toISOString();

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

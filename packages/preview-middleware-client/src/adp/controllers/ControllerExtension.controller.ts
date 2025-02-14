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

/** sap.ui.layout */
import type SimpleForm from 'sap/ui/layout/form/SimpleForm';

/** sap.ui.dt */
import type ElementOverlay from 'sap/ui/dt/ElementOverlay';

import type { CodeExtResponse, ControllersResponse } from '../api-handler';
import { getExistingController, readControllers, writeChange, writeController } from '../api-handler';
import BaseDialog from './BaseDialog.controller';
import { getControllerInfo } from '../utils';

interface ControllerExtensionService {
    add: (codeRef: string, viewId: string) => Promise<{ creation: string }>;
}

type ControllerModel = JSONModel & {
    getProperty(sPath: '/controllersList'): { controllerName: string }[];
    getProperty(sPath: '/controllerExists'): boolean;
    getProperty(sPath: '/newControllerName'): string;
    getProperty(sPath: '/viewId'): string;
    getProperty(sPath: '/controllerPath'): string;
    getProperty(sPath: '/controllerExtension'): string;
};

/**
 * @namespace open.ux.preview.client.adp.controllers
 */
export default class ControllerExtension extends BaseDialog<ControllerModel> {
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
        const controllerList = this.model.getProperty('/controllersList');

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

        const { controllerName, viewId } = getControllerInfo(overlayControl);
        const data = await this.getExistingController(controllerName);

        if (data) {
            if (data?.controllerExists) {
                this.updateModelForExistingController(data);
            } else {
                this.updateModelForNewController(viewId, data.isTsSupported);

                await this.getControllers();
            }
        }
    }
    /**
     * Updates the model properties for an existing controller.
     *
     * @param {CodeExtResponse} data - Existing controller data from the server.
     */
    private updateModelForExistingController(data: CodeExtResponse): void {
        const { controllerExists, controllerPath, controllerPathFromRoot, isRunningInBAS } = data;

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
     * @param {string} viewId - The view ID.
     * @param {boolean} isTsSupported - Whether TypeScript supported for the current project.
     */
    private updateModelForNewController(viewId: string, isTsSupported: boolean): void {
        this.model.setProperty('/viewId', viewId);
        this.model.setProperty('/controllerExtension', isTsSupported ? '.ts' : '.js');
    }

    /**
     * Retrieves existing controller data if found in the project's workspace.
     *
     * @param controllerName Controller name that exists in the view.
     * @returns Returns existing controller data.
     */
    private async getExistingController(controllerName: string): Promise<CodeExtResponse | undefined> {
        let data: CodeExtResponse | undefined;
        try {
            data = await getExistingController(controllerName);
        } catch (e) {
            this.handleError(e);
        }

        return data;
    }

    /**
     * Retrieves controller files and fills the model with data
     */
    async getControllers(): Promise<void> {
        try {
            const { controllers } = await readControllers<ControllersResponse>();
            this.model.setProperty('/controllersList', controllers);
        } catch (e) {
            this.handleError(e);
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
            await writeController({ controllerName });

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
            this.handleError(e);
        }
    }
}

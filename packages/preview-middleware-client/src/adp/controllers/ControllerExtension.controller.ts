/** sap.m */
import Button from 'sap/m/Button';
import type Dialog from 'sap/m/Dialog';
import Input from 'sap/m/Input';

/** sap.ui.core */
import type UI5Element from 'sap/ui/core/Element';
import { ValueState } from 'sap/ui/core/library';

/** sap.ui.base */
import type Event from 'sap/ui/base/Event';

/** sap.ui.model */
import JSONModel from 'sap/ui/model/json/JSONModel';

/** sap.ui.rta */
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

/** sap.ui.dt */
import type ElementOverlay from 'sap/ui/dt/ElementOverlay';

import { MessageBarType } from '@sap-ux-private/control-property-editor-common';
import { QuickActionTelemetryData } from '../../cpe/quick-actions/quick-action-definition';
import { getResourceModel, getTextBundle, TextBundle } from '../../i18n';
import { getControlById } from '../../utils/core';
import { getError } from '../../utils/error';
import { sendInfoCenterMessage } from '../../utils/info-center-message';
import { getUi5Version, isLowerThanMinimalUi5Version } from '../../utils/version';
import type { CodeExtResponse, ControllersResponse } from '../api-handler';
import { getExistingController, readControllers, writeChange, writeController } from '../api-handler';
import CommandExecutor from '../command-executor';
import type { DeferredExtendControllerData, ExtendControllerData } from '../extend-controller';
import { checkForExistingChange, getControllerInfo } from '../utils';
import BaseDialog from './BaseDialog.controller';

interface ControllerExtensionService {
    add: (codeRef: string, viewId: string) => Promise<{ creation: string }>;
}

type ControllerList = {
    /**
     * File name without extension
     */
    controllerName: string;
}[];

type ControllerModel = JSONModel & {
    getProperty(sPath: '/controllersList'): ControllerList;
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
    /* The minimum version of UI5 framework which supports controller extensions. */
    private static readonly CONTROLLER_EXT_MIN_UI5_VERSION = { major: 1, minor: 135 };
    public readonly data?: ExtendControllerData;
    private bundle: TextBundle;

    constructor(
        name: string,
        overlays: UI5Element,
        rta: RuntimeAuthoring,
        data?: ExtendControllerData,
        telemetryData?: QuickActionTelemetryData
    ) {
        super(name, telemetryData);
        this.rta = rta;
        this.overlays = overlays;
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

        const resourceModel = await getResourceModel('open.ux.preview.client');
        this.bundle = await getTextBundle();

        await this.buildDialogData();

        this.dialog.setModel(resourceModel, 'i18n');
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

        const fileExists = controllerList.some((f) => f.controllerName === controllerName);

        const pendingChangeExists = checkForExistingChange(
            this.rta,
            'codeExt',
            'content.codeRef',
            `${controllerName}.js`
        );

        if (fileExists) {
            updateDialogState(
                ValueState.Error,
                'Enter a different name. The controller name that you entered already exists in your project.'
            );
            return;
        }

        if (pendingChangeExists) {
            updateDialogState(
                ValueState.Error,
                'Enter a different name. The controller name that you entered already exists as a pending change.'
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

        await super.onCreateBtnPressHandler();

        const controllerExists = this.model.getProperty('/controllerExists');

        if (!controllerExists) {
            source.setEnabled(false);

            const controllerName = this.model.getProperty('/newControllerName');
            const viewId = this.model.getProperty('/viewId');

            const controllerRef = {
                codeRef: `coding/${controllerName}.js`,
                viewId
            };

            if (this.data) {
                this.data.deferred.resolve(controllerRef);
            } else {
                await this.createNewController(controllerName, controllerRef);
            }

            if (this.data && (await this.isControllerExtensionSupported())) {
                await sendInfoCenterMessage({
                    title: { key: 'ADP_CREATE_CONTROLLER_EXTENSION_TITLE' },
                    description: { key: 'ADP_CREATE_CONTROLLER_EXTENSION', params: [controllerName] },
                    type: MessageBarType.info
                });
            }
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

        const hasPendingChangeForView = checkForExistingChange(
            this.rta,
            'codeExt',
            'selector.controllerName',
            controllerName
        );

        if (data) {
            if (hasPendingChangeForView) {
                this.updateModelForExistingPendingChange();
            } else if (data?.controllerExists) {
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
        this.model.setProperty('/inputFormVisibility', false);
        this.model.setProperty('/pendingChangeFormVisibility', false);
        this.model.setProperty('/existingControllerFormVisibility', true);

        if (isRunningInBAS) {
            this.dialog.getBeginButton().setVisible(false);
        } else {
            this.dialog.getBeginButton().setText('Open in VS Code').setEnabled(true);
        }
        this.dialog.getEndButton().setText('Close');
    }

    /**
     * Updates the model properties for an existing controller in a pending change.
     */
    private updateModelForExistingPendingChange(): void {
        this.model.setProperty('/inputFormVisibility', false);
        this.model.setProperty('/existingControllerFormVisibility', false);
        this.model.setProperty('/pendingChangeFormVisibility', true);

        this.dialog.getBeginButton().setVisible(false);
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
        this.model.setProperty('/existingControllerFormVisibility', false);
        this.model.setProperty('/pendingChangeFormVisibility', false);
        this.model.setProperty('/inputFormVisibility', true);
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
            const error = getError(e);
            await sendInfoCenterMessage({
                title: { key: 'ADP_CONTROLLER_ERROR_TITLE' },
                description: error.message,
                type: MessageBarType.error
            });
            throw error;
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
            const error = getError(e);
            await sendInfoCenterMessage({
                title: { key: 'ADP_CONTROLLER_ERROR_TITLE' },
                description: error.message,
                type: MessageBarType.error
            });
            throw error;
        }
    }

    /**
     * Creates a new fragment for the specified control
     *
     * @param controllerName Controller Name
     * @param controllerRef Controller reference
     */
    private async createNewController(
        controllerName: string,
        controllerRef: DeferredExtendControllerData
    ): Promise<void> {
        if (await this.isControllerExtensionSupported()) {
            await this.createControllerCommand(controllerName, controllerRef);
            return;
        }
        try {
            await writeController({ controllerName });

            const service = await this.rta.getService<ControllerExtensionService>('controllerExtension');

            const change = await service.add(controllerRef.codeRef, controllerRef.viewId);
            change.creation = new Date().toISOString();

            await writeChange(change);
            await sendInfoCenterMessage({
                title: { key: 'ADP_CREATE_CONTROLLER_EXTENSION_TITLE' },
                description: {
                    key: 'ADP_CREATE_CONTROLLER_EXTENSION_DESCRIPTION',
                    params: [controllerName]
                },
                type: MessageBarType.info
            });
        } catch (e) {
            const error = getError(e);
            await sendInfoCenterMessage({
                title: { key: 'ADP_CONTROLLER_ERROR_TITLE' },
                description: error.message,
                type: MessageBarType.error
            });
            // We want to update the model incase we have already created a controller file but failed when creating a change file,
            // so when the user types the same controller name again he does not get 409 from the server, instead an error is shown in the UI
            await this.getControllers();
            throw error;
        }
    }

    /**
     * Creates a controller command and executes it.
     *
     * @param controllerName Controller name
     * @param controllerRef Controller reference
     */
    private async createControllerCommand(
        controllerName: string,
        controllerRef: DeferredExtendControllerData
    ): Promise<void> {
        const flexSettings = this.rta.getFlexSettings();
        const commandExecutor = new CommandExecutor(this.rta);
        const view = getControlById(controllerRef.viewId) as UI5Element;
        const command = await commandExecutor.getCommand<DeferredExtendControllerData>(
            view,
            'codeExt',
            controllerRef,
            flexSettings
        );

        await commandExecutor.pushAndExecuteCommand(command);

        await sendInfoCenterMessage({
            title: { key: 'ADP_CREATE_CONTROLLER_EXTENSION_TITLE' },
            description: { key: 'ADP_CREATE_CONTROLLER_EXTENSION', params: [controllerName] },
            type: MessageBarType.info
        });
    }

    private async isControllerExtensionSupported(): Promise<boolean> {
        const ui5Version = await getUi5Version();
        return !isLowerThanMinimalUi5Version(ui5Version, ControllerExtension.CONTROLLER_EXT_MIN_UI5_VERSION);
    }
}

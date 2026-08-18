/** sap.m */
import Button from 'sap/m/Button';
import type Dialog from 'sap/m/Dialog';
import Input from 'sap/m/Input';
import type RadioButtonGroup from 'sap/m/RadioButtonGroup';

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
import { QuickActionTelemetryData } from '../../cpe/quick-actions/quick-action-definition.js';
import { getResourceModel, getTextBundle, TextBundle } from '../../i18n.js';
import { getControlById } from '../../utils/core.js';
import { getError } from '../../utils/error.js';
import { sendInfoCenterMessage } from '../../utils/info-center-message.js';
import { getUi5Version, isLowerThanMinimalUi5Version, type Ui5VersionInfo } from '../../utils/version.js';
import type { CodeExtResponse, ControllersResponse } from '../api-handler.js';
import { getExistingController, readControllers, writeChange, writeController } from '../api-handler.js';
import CommandExecutor from '../command-executor.js';
import type { DeferredExtendControllerData, ExtendControllerData } from '../extend-controller.js';
import { checkForExistingChange, getControllerInfo, getPendingCodeExtViewIds } from '../utils.js';
import BaseDialog from './BaseDialog.controller.js';

interface ControllerExtensionService {
    add: (codeRef: string, viewId: string, includeViewId?: boolean) => Promise<{ creation: string }>;
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
    getProperty(sPath: '/baseControllerPath'): string;
    getProperty(sPath: '/instanceControllerPath'): string;
    getProperty(sPath: '/controllerExtension'): string;
    getProperty(sPath: '/isInstanceSpecific'): boolean;
    getProperty(sPath: '/instanceSpecificVisibility'): boolean;
    getProperty(sPath: '/baseControllerEnabled'): boolean;
    getProperty(sPath: '/instanceControllerEnabled'): boolean;
    getProperty(sPath: '/controllerTypeSelectedIndex'): number;
};

/**
 * @namespace open.ux.preview.client.adp.controllers
 */
export default class ControllerExtension extends BaseDialog<ControllerModel> {
    /* The minimum version of UI5 framework which supports controller extensions. */
    private static readonly CONTROLLER_EXT_MIN_UI5_VERSION = { major: 1, minor: 135 };
    /* The minimum version of UI5 framework which supports instance-specific controller extensions. */
    private static readonly INSTANCE_SPECIFIC_MIN_UI5_VERSION = { major: 1, minor: 143 };
    public readonly data?: ExtendControllerData;
    private bundle: TextBundle;
    private ui5Version: Ui5VersionInfo;

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
        this.ui5Version = await getUi5Version();

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
            const isInstanceSpecific = this.model.getProperty('/isInstanceSpecific');

            const controllerRef: DeferredExtendControllerData = {
                codeRef: `coding/${controllerName}.js`,
                viewId,
                instanceSpecific: isInstanceSpecific
            };

            if (this.data) {
                this.data.deferred.resolve(controllerRef);
            } else {
                await this.createNewController(controllerName, controllerRef);
            }

            if (this.data && this.isControllerExtensionSupported()) {
                await sendInfoCenterMessage({
                    title: { key: 'ADP_CREATE_CONTROLLER_EXTENSION_TITLE' },
                    description: { key: 'ADP_CREATE_CONTROLLER_EXTENSION', params: [controllerName] },
                    type: MessageBarType.info
                });
            }
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
        const data = await this.getExistingController(controllerName, viewId);

        if (!data) {
            return;
        }

        // Combine persisted (server) and pending (command stack) changes to determine whether a base
        // page controller and/or an instance-specific controller for this view already exist.
        const pendingViewIds = getPendingCodeExtViewIds(this.rta, controllerName);
        const baseExists = data.baseControllerExists || pendingViewIds.some((id) => !id);
        const instanceExists = data.instanceControllerExists || pendingViewIds.includes(viewId);

        const showInstanceSpecificOption = this.isInstanceSpecificSupported();

        if (!showInstanceSpecificOption) {
            if (pendingViewIds.some((id) => !id)) {
                this.updateModelForExistingPendingChange();
            } else if (data.baseControllerExists) {
                this.updateModelForExistingController(data, true);
            } else {
                this.updateModelForNewController(viewId, data.isTsSupported, false, false, false);
                await this.getControllers();
            }
            return;
        }

        if (baseExists && instanceExists) {
            if (data.baseControllerExists || data.instanceControllerExists) {
                this.updateModelForExistingController(data);
            } else {
                this.updateModelForExistingPendingChange();
            }
            return;
        }

        this.updateModelForNewController(viewId, data.isTsSupported, true, baseExists, instanceExists);
        await this.getControllers();
    }
    /**
     * Updates the model properties for existing controller(s).
     * Shows all persisted controllers (base and/or instance) in the existing-controller form, each with its own link to open in VS Code.
     *
     * @param data - Server response containing existence flags and file paths.
     * @param showVsCodeButton - When true (pre-1.143 single-controller path), shows an "Open in VS Code" begin-button instead of relying on the inline fragment links.
     */
    private updateModelForExistingController(data: CodeExtResponse, showVsCodeButton = false): void {
        this.model.setProperty('/controllerExists', true);
        this.model.setProperty('/baseControllerExists', data.baseControllerExists);
        this.model.setProperty('/baseControllerPath', data.baseControllerPath);
        this.model.setProperty('/baseControllerPathFromRoot', data.baseControllerPathFromRoot);
        this.model.setProperty('/instanceControllerExists', data.instanceControllerExists);
        this.model.setProperty('/instanceControllerPath', data.instanceControllerPath);
        this.model.setProperty('/instanceControllerPathFromRoot', data.instanceControllerPathFromRoot);
        this.model.setProperty('/isRunningInBAS', data.isRunningInBAS);
        this.model.setProperty('/inputFormVisibility', false);
        this.model.setProperty('/pendingChangeFormVisibility', false);
        this.model.setProperty('/existingControllerFormVisibility', true);

        if (showVsCodeButton && !data.isRunningInBAS) {
            this.dialog.getBeginButton().setText('Open in VS Code').setEnabled(true);
        } else {
            this.dialog.getBeginButton().setVisible(false);
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
     * @param {boolean} showInstanceSpecificOption - Whether to show the instance-specific radio button option.
     * @param {boolean} baseExists - Whether a base page controller extension already exists.
     * @param {boolean} instanceExists - Whether an instance-specific extension already exists for this view.
     */
    private updateModelForNewController(
        viewId: string,
        isTsSupported: boolean,
        showInstanceSpecificOption: boolean,
        baseExists: boolean,
        instanceExists: boolean
    ): void {
        this.model.setProperty('/viewId', viewId);
        this.model.setProperty('/controllerExtension', isTsSupported ? '.ts' : '.js');
        this.model.setProperty('/existingControllerFormVisibility', false);
        this.model.setProperty('/pendingChangeFormVisibility', false);
        this.model.setProperty('/inputFormVisibility', true);
        this.model.setProperty('/instanceSpecificVisibility', showInstanceSpecificOption);
        this.model.setProperty('/baseControllerEnabled', !baseExists);
        this.model.setProperty('/instanceControllerEnabled', !instanceExists);
        const selectedIndex = baseExists ? 1 : 0;
        this.model.setProperty('/controllerTypeSelectedIndex', selectedIndex);
        this.model.setProperty('/isInstanceSpecific', selectedIndex === 1);
    }

    /**
     * Retrieves existing controller data if found in the project's workspace.
     *
     * @param controllerName Controller name that exists in the view.
     * @param viewId ID of the current view, used to detect an existing instance-specific extension.
     * @returns Returns existing controller data.
     */
    private async getExistingController(controllerName: string, viewId: string): Promise<CodeExtResponse | undefined> {
        let data: CodeExtResponse | undefined;
        try {
            data = await getExistingController(controllerName, viewId);
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
        if (this.isControllerExtensionSupported()) {
            await this.createControllerCommand(controllerName, controllerRef);
            return;
        }
        try {
            await writeController({ controllerName });

            const service = await this.rta.getService<ControllerExtensionService>('controllerExtension');

            const change = await service.add(
                controllerRef.codeRef,
                controllerRef.viewId,
                controllerRef.instanceSpecific
            );
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

    private isControllerExtensionSupported(): boolean {
        return !isLowerThanMinimalUi5Version(this.ui5Version, ControllerExtension.CONTROLLER_EXT_MIN_UI5_VERSION);
    }

    /**
     * Handles selection change on the controller type radio button group.
     *
     * @param event Event
     */
    onControllerTypeSelectionChange(event: Event): void {
        const group = event.getSource<RadioButtonGroup>();
        this.model.setProperty('/isInstanceSpecific', group.getSelectedIndex() === 1);
    }

    /**
     * Opens the base page controller extension file in VS Code.
     */
    onOpenBaseController(): void {
        window.open(`vscode://file${this.model.getProperty('/baseControllerPath')}`);
    }

    /**
     * Opens the instance-specific controller extension file in VS Code.
     */
    onOpenInstanceController(): void {
        window.open(`vscode://file${this.model.getProperty('/instanceControllerPath')}`);
    }

    private isInstanceSpecificSupported(): boolean {
        return !isLowerThanMinimalUi5Version(this.ui5Version, ControllerExtension.INSTANCE_SPECIFIC_MIN_UI5_VERSION);
    }
}

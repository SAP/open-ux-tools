import RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import { PageDescriptorV4 } from './types';
import UI5Element from 'sap/ui/core/Element';
import BaseDialog from './BaseDialog.controller';
import { QuickActionTelemetryData } from '../../cpe/quick-actions/quick-action-definition';
import JSONModel from 'sap/ui/model/json/JSONModel';
import Dialog from 'sap/m/Dialog';
import { getResourceModel } from '../../i18n';
import { MessageBarType } from '@sap-ux-private/control-property-editor-common';
import Button from 'sap/m/Button';
import { sendInfoCenterMessage } from '../../utils/info-center-message';
import Input from 'sap/m/Input';
import CommandExecutor from '../command-executor';
import Event from 'sap/ui/base/Event';
import { getFragments } from '../api-handler';
import { getError } from '../../utils/error';
import { ValueState } from 'sap/ui/core/library';
import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import SimpleForm from 'sap/ui/layout/form';
import Control from 'sap/ui/core/Control';

type AddActionFragmentsModel = JSONModel & {
    getProperty(sPath: '/title'): string;
    getProperty(sPath: '/buttonText'): string;
    getProperty(sPath: '/actionId'): string;
    getProperty(sPath: '/handlerReference'): string;
    getProperty(sPath: '/hasController'): boolean;
};

export interface AddActionOptions {
    name: string;
    propertyPath: string;
    title: string;
    controllerReference: string;
    appDescriptor?: PageDescriptorV4;
    validateActionId?: (actionId: string) => boolean;
}

/**
 * Validates Action ID input
 * @param input control of action ID to validate
 * @param validateForDuplicateId custom validation function
 */
function validateActionId(input: Input, validateForDuplicateId: (actionId: string) => boolean): void {
    // { isValid: boolean; errorMessage?: string }
    const actionId = input.getValue();
    // Check if empty
    if (!actionId || actionId.trim().length === 0) {
        //return { isValid: false, errorMessage: 'Action ID is required' };
        input.setValueState(ValueState.Error).setValueStateText('Action ID is required');
        return;
    }

    if (!validateForDuplicateId(actionId)) {
        //return { isValid: false, errorMessage: 'Action ID is required' };
        input.setValueState(ValueState.Error).setValueStateText(`Action with ID '${actionId}' is already defined`);
        return;
    }

    // Check for spaces
    if (actionId.includes(' ')) {
        //return { isValid: false, errorMessage: 'Action ID cannot contain spaces' };
        input.setValueState(ValueState.Error).setValueStateText('Action ID cannot contain spaces');
        return;
    }

    // Check if starts with number
    if (/^\d/.test(actionId)) {
        input.setValueState(ValueState.Error).setValueStateText('Action ID cannot start with a number');
        return;
        //return { isValid: false, errorMessage: 'Action ID cannot start with a number' };
    }
    input.setValueState(ValueState.Success).setValueStateText('');
    //return { isValid: true };
}

export default class AddActionFragment extends BaseDialog<AddActionFragmentsModel> {
    constructor(
        name: string,
        overlays: UI5Element,
        rta: RuntimeAuthoring,
        readonly options: AddActionOptions,
        telemetryData?: QuickActionTelemetryData
    ) {
        super(name, telemetryData);
        this.rta = rta;
        this.overlays = overlays;
        this.model = new JSONModel({
            title: options.title
        }) as AddActionFragmentsModel;
        this.commandExecutor = new CommandExecutor(this.rta);
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
        const resourceModel = await getResourceModel('open.ux.preview.client');

        this.dialog.setModel(resourceModel, 'i18n');
        this.dialog.setModel(this.model);

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
        await super.onCreateBtnPressHandler();

        const actionId = this.model.getProperty('/actionId');
        const buttonText = this.model.getProperty('/buttonText');
        //const actionName = convertCamelCaseToPascalCase(nameToBeDisplayedOnUI, true);
        await this.createAppDescriptorChangeForV4(`${this.options.propertyPath}${actionId}`, buttonText);
        // await sendInfoCenterMessage({
        //     title: { key: 'QUICK_ACTION_ADD_CUSTOM_PAGE_ACTION' },
        //     description: {
        //         key: 'ADP_ADD_TWO_FRAGMENTS_WITH_TEMPLATE_NOTIFICATION',
        //         params: [columnFragmentName, cellFragmentName]
        //     },
        //     type: MessageBarType.info
        // });
        this.updateFormState();
        this.handleDialogClose();
    }

    /**
     * Builds data that is used in the dialog
     */
    async buildDialogData(): Promise<void> {
        try {
            const { fragments } = await getFragments();
            this.model.setProperty('/fragmentList', fragments);
            let hasController = false;
            if (this.options.controllerReference) {
                this.model.setProperty('/handlerReference', this.options.controllerReference);
                hasController = true;
            }
            this.model.setProperty('/hasController', hasController);
        } catch (e) {
            const error = getError(e);
            await sendInfoCenterMessage({
                title: { key: 'ADP_GET_FRAGMENTS_FAILURE_TITLE' },
                description: error.message,
                type: MessageBarType.error
            });
            throw error;
        }
    }

    /**
     * Checks input values for duplicates and updates confirmation button state based on input validation states
     */
    private updateFormState() {
        const form = this.dialog.getContent()[0] as unknown as SimpleForm<Control[]>;
        const formContent = form.getContent();
        const inputs = formContent.filter((item) => item.isA('sap.m.Input')) as Input[];

        // const value1 = inputs[0].getValue();
        const value2 = inputs[1].getValue();
        validateActionId(inputs[0], this.options.validateActionId ?? (() => true));
        if (value2.length > 0) {
            inputs[1].setValueState(ValueState.Success).setValueStateText('');
        } else {
            inputs[1].setValueState(ValueState.Error).setValueStateText('Button Text is required');
        }

        const beginBtn = this.dialog.getBeginButton();
        // Exclude the last input (display-only) from validation
        // Only validate inputs that are visible and editable
        const validatableInputs = inputs.filter((input) => input.getVisible() && input.getEditable());
        beginBtn.setEnabled(validatableInputs.every((input) => input.getValueState() === ValueState.Success));
    }

    /**
     * Handles action id input change
     *
     * @param event Event
     */
    onActionIdInputChange(event: Event): void {
        // update model value
        const input = event.getSource<Input>();
        let modelValue: string | null = input.getValue();
        if (modelValue.length < 1) {
            modelValue = null;
        }
        this.model.setProperty('/actionId', modelValue);
        this.updateFormState();
    }

    onButtonTextInputChange(event: Event): void {
        // update model value
        const input = event.getSource<Input>();
        let modelValue: string | null = input.getValue();
        if (modelValue.length < 1) {
            modelValue = null;
        }
        this.model.setProperty('/buttonText', modelValue);
        this.updateFormState();
    }

    private async createAppDescriptorChangeForV4(propertyPath: string, actionLabel: string) {
        // const template = `${this.options.appDescriptor?.projectId}.changes.${templatePath}`;
        // let sectionId = this.options.appDescriptor?.anchor;
        const flexSettings = this.rta.getFlexSettings();
        const modifiedValue = {
            reference: this.options.appDescriptor?.projectId,
            appComponent: this.options.appDescriptor?.appComponent,
            changeType: 'appdescr_fe_changePageConfiguration',
            parameters: {
                page: this.options.appDescriptor?.pageId,
                entityPropertyChange: {
                    propertyPath: `${propertyPath}`, // e.g. 'content/body/sections/test'
                    operation: 'UPSERT',
                    propertyValue: {
                        // template,
                        press: this.options.controllerReference,
                        visible: true,
                        enabled: true,
                        text: actionLabel
                        //     position: {
                        //         placement: 'After',
                        //    //     anchor: `${sectionId}`
                        //     }
                    }
                }
            }
        };
        const command = await this.commandExecutor.getCommand<FlexCommand>(
            this.getRuntimeControl(),
            'appDescriptor',
            modifiedValue,
            flexSettings
        );

        await this.commandExecutor.pushAndExecuteCommand(command);
    }
}

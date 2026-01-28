/** sap.m */
import Button from 'sap/m/Button';
import type Dialog from 'sap/m/Dialog';

/** sap.ui.core */
import type UI5Element from 'sap/ui/core/Element';

/** sap.ui.base */
import type Event from 'sap/ui/base/Event';

/** sap.ui.model */
import JSONModel from 'sap/ui/model/json/JSONModel';

/** sap.ui.rta */
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

import { getResourceModel, getTextBundle, TextBundle } from '../../i18n';
import CommandExecutor from '../command-executor';
import BaseDialog from './BaseDialog.controller';
import { QuickActionTelemetryData } from '../../cpe/quick-actions/quick-action-definition';
import { MessageBarType, setApplicationRequiresReload } from '@sap-ux-private/control-property-editor-common';
import { CommunicationService } from '../../cpe/communication-service';
import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import { sendInfoCenterMessage } from '../../utils/info-center-message';
import { getError } from '../../utils/error';
import { PageDescriptorV4 } from './types';
import Input from 'sap/m/Input';
import { ValueState } from 'sap/ui/core/library';
import SimpleForm from 'sap/ui/layout/form';
import Control from 'sap/ui/core/Control';

export type AddFragmentModel = JSONModel & {
    getProperty(sPath: '/title'): string;
    getProperty(sPath: '/newFragmentName'): string;
    getProperty(sPath: '/isCustomColumnFragment'): boolean;
};

export interface AddCustomFragmentOptions {
    title: string;
    propertyPath: string;
    appDescriptor?: PageDescriptorV4;
    validateId?: (id: string) => boolean;
    type: 'section' | 'tableColumn';
    availability?: 'Default' | 'Adaptation' | 'Hidden';
}

/**
 * Validates Control ID input.
 *
 * @param input control of control ID to validate
 * @param validateForDuplicateId custom validation function
 * @return validation result
 */
function validateControlId(
    input: Input,
    resource: TextBundle,
    identifier: 'Column' = 'Column',
    validateForDuplicateId?: (id: string) => boolean
): { isValid: boolean; errorMessage: string } {
    const id = input.getValue();
    // Check if empty
    if (!id || id.trim().length === 0) {
        return { isValid: false, errorMessage: resource.getText('ID_REQUIRED', [identifier]) };
    }

    if (typeof validateForDuplicateId === 'function' && !validateForDuplicateId?.(id)) {
        return { isValid: false, errorMessage: resource.getText('GIVEN_ID_ALREADY_EXISTS', [identifier, id]) };
    }

    // Check if starts with number
    if (!/(^([A-Za-z_][-A-Za-z0-9_.:]*)$)/.test(id)) {
        return { isValid: false, errorMessage: resource.getText('ID_INVALID_FORMAT', [identifier]) };
    }
    return { isValid: true, errorMessage: '' };
}

/**
 * @namespace open.ux.preview.client.adp.controllers
 */
export default class AddCustomFragment extends BaseDialog<AddFragmentModel> {
    private bundle: TextBundle;
    constructor(
        name: string,
        overlays: UI5Element,
        rta: RuntimeAuthoring,
        readonly options: AddCustomFragmentOptions,
        telemetryData?: QuickActionTelemetryData
    ) {
        super(name, telemetryData);
        this.rta = rta;
        this.overlays = overlays;
        this.model = new JSONModel({
            title: options.title
        });
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
        this.bundle = await getTextBundle();
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

        const fragmentName = this.model.getProperty('/newFragmentName');
        const template = `fragments.${fragmentName}`;
        await this.createAppDescriptorChangeForV4(template);
        CommunicationService.sendAction(setApplicationRequiresReload(true));

        await sendInfoCenterMessage({
            title: { key: this.options.title ?? 'ADP_ADD_FRAGMENT_DIALOG_TITLE' },
            description: { key: 'ADP_ADD_FRAGMENT_NOTIFICATION', params: [fragmentName] },
            type: MessageBarType.warning
        });

        this.handleDialogClose();
    }

    /**
     * Builds data that is used in the dialog
     */
    async buildDialogData(): Promise<void> {
        try {
            let isCustomColumnFragment = false;
            if (this.options.type === 'tableColumn') {
                isCustomColumnFragment = true;
            }
            this.model.setProperty('/isCustomColumnFragment', isCustomColumnFragment);
        } catch (e) {
            const error = getError(e);
            await sendInfoCenterMessage({
                title: { key: this.options.title ?? 'ADP_ADD_FRAGMENT_DIALOG_TITLE' },
                description: error.message,
                type: MessageBarType.error
            });
            throw error;
        }
    }
    /**
     * Checks input values for duplicates and updates confirmation button state based on input validation states
     */
    private updateFormState(): void {
        const form = this.dialog.getContent()[0] as unknown as SimpleForm<Control[]>;
        const formContent = form.getContent();
        const inputs = formContent.filter((item) => item.isA('sap.m.Input')) as Input[];

        const beginBtn = this.dialog.getBeginButton();
        // Exclude the last input (display-only) from validation
        // Only validate inputs that are visible and editable
        const validatableInputs = inputs.filter((input) => input.getVisible() && input.getEditable());
        beginBtn.setEnabled(validatableInputs.every((input) => input.getValueState() === ValueState.Success));
    }

    /**
     * Handles id input change
     *
     * @param event Event
     */
    onIdInputChange(event: Event): void {
        // update model value
        const input = event.getSource<Input>();
        let modelValue: string | null = input.getValue();
        if (modelValue.length < 1) {
            modelValue = null;
        }
        this.model.setProperty('/id', modelValue);
        const result = validateControlId(input, this.bundle, 'Column', this.options.validateId);
        if (result.isValid) {
            input.setValueState(ValueState.Success).setValueStateText('');
        } else {
            input.setValueState(ValueState.Error).setValueStateText(result.errorMessage);
        }
        this.updateFormState();
    }

    private async createAppDescriptorChangeForV4(templatePath: string) {
        const id =
            this.options.type === 'tableColumn'
                ? this.model.getProperty('/id')
                : this.model.getProperty('/newFragmentName');
        const template = `${this.options.appDescriptor?.projectId}.changes.${templatePath}`;
        const anchor = this.options.appDescriptor?.anchor;
        const flexSettings = this.rta.getFlexSettings();
        const modifiedValue = {
            reference: this.options.appDescriptor?.projectId,
            appComponent: this.options.appDescriptor?.appComponent,
            changeType: 'appdescr_fe_changePageConfiguration',
            parameters: {
                page: this.options.appDescriptor?.pageId,
                entityPropertyChange: {
                    propertyPath: `${this.options.propertyPath}${id}`, // e.g. 'content/body/sections/test'
                    operation: 'UPSERT',
                    propertyValue: {
                        template,
                        ...(this.options.type === 'tableColumn'
                            ? { header: 'New Column' }
                            : { title: 'New Custom Section' }),
                        ...(anchor && {
                            position: {
                                placement: 'After',
                                anchor
                            }
                        })
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

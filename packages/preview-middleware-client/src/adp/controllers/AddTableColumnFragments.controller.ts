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

/** sap.ui.dt */
import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';

/** sap.ui.fl */
import { AddTableCellFragmentChangeContentType } from 'sap/ui/fl/Change';

/** sap.ui.layout */
import { type SimpleForm } from 'sap/ui/layout/form';

import { setApplicationRequiresReload } from '@sap-ux-private/control-property-editor-common';

import { getResourceModel, getTextBundle } from '../../i18n';
import { CommunicationService } from '../../cpe/communication-service';

import ControlUtils from '../control-utils';
import CommandExecutor from '../command-executor';
import { getFragments } from '../api-handler';
import BaseDialog from './BaseDialog.controller';
import { notifyUser } from '../utils';
import { type AddFragmentModel, type AddFragmentOptions } from './AddFragment.controller';
import { ValueState } from 'sap/ui/core/library';
import Input from 'sap/m/Input';
import Control from 'sap/ui/core/Control';
import ManagedObject from 'sap/ui/base/ManagedObject';

const radix = 10;

type AddTableColumnsFragmentsModel = AddFragmentModel & {
    getProperty(sPath: '/newColumnFragmentName'): string;
    getProperty(sPath: '/newCellFragmentName'): string;
};

const COLUMNS_AGGREGATION = 'columns';
const ITEMS_AGGREGATION = 'items';
const CELLS_AGGREGATION = 'cells';

interface CreateFragmentProps {
    index: string | number;
    fragments: { fragmentName: string; targetAggregation: string }[];
}

/**
 * @namespace open.ux.preview.client.adp.controllers
 */
export default class AddTableColumnFragments extends BaseDialog<AddTableColumnsFragmentsModel> {
    constructor(name: string, overlays: UI5Element, rta: RuntimeAuthoring, readonly options: AddFragmentOptions) {
        super(name);
        this.rta = rta;
        this.overlays = overlays;
        this.model = new JSONModel({
            title: options.title
        }) as AddTableColumnsFragmentsModel;
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

        const columnFragmentName = this.model.getProperty('/newColumnFragmentName');
        const cellFragmentName = this.model.getProperty('/newCellFragmentName');
        const index = this.model.getProperty('/selectedIndex');
        const fragmentData: CreateFragmentProps = {
            index,
            fragments: [
                {
                    fragmentName: columnFragmentName,
                    targetAggregation: this.model.getProperty('/selectedColumnsAggregation')
                },
                {
                    fragmentName: cellFragmentName,
                    targetAggregation: this.model.getProperty('/selectedItemsAggregation')
                }
            ]
        };

        await this.createFragmentChange(fragmentData);

        const textKey = 'ADP_ADD_TWO_FRAGMENTS_WITH_TEMPLATE_NOTIFICATION';
        const bundle = await getTextBundle();
        notifyUser(
            bundle.getText(
                textKey,
                fragmentData.fragments.map((item) => item.fragmentName)
            ),
            8000
        );

        this.handleDialogClose();
    }

    /**
     * Builds data that is used in the dialog
     */
    async buildDialogData(): Promise<void> {
        const { controlMetadata, targetAggregation } = this.getControlMetadata();
        const defaultAggregation = this.options.aggregation ?? controlMetadata.getDefaultAggregationName();
        const selectedControlName = controlMetadata.getName();

        let selectedControlChildren: string[] | number[] = Object.keys(
            ControlUtils.getControlAggregationByName(this.runtimeControl, defaultAggregation)
        );

        selectedControlChildren = selectedControlChildren.map((key) => {
            return parseInt(key, radix);
        });

        this.model.setProperty('/selectedControlName', selectedControlName);

        const indexArray = this.fillIndexArray(selectedControlChildren);

        if (!targetAggregation.includes(COLUMNS_AGGREGATION)) {
            throw new Error(`Selected control does not have "${COLUMNS_AGGREGATION}" aggregation`);
        }
        this.model.setProperty('/selectedColumnsAggregation', COLUMNS_AGGREGATION);
        this.specialIndexHandling(COLUMNS_AGGREGATION);

        if (!targetAggregation.includes(ITEMS_AGGREGATION)) {
            throw new Error(`Selected control does not have "${ITEMS_AGGREGATION}" aggregation`);
        }
        this.model.setProperty('/selectedItemsAggregation', ITEMS_AGGREGATION);

        try {
            const { fragments } = await getFragments();
            this.model.setProperty('/fragmentList', fragments);
        } catch (e) {
            this.handleError(e);
        }

        this.model.setProperty('/index', indexArray);
        this.model.setProperty('/selectedIndex', indexArray.length - 1);
    }

    /**
     * Checks input values for duplicates and updates confirmation button state based on input validation states
     */
    private updateFormState() {
        const form = this.dialog.getContent()[0] as unknown as SimpleForm<Control[]>;
        const formContent = form.getContent();
        const inputs = formContent.filter((item) => item.isA('sap.m.Input')) as Input[];

        const value1 = inputs[0].getValue();
        const value2 = inputs[1].getValue();
        // check duplicating fragment names
        if (value1 === value2 && value1.length) {
            inputs.forEach((input) => {
                if (input.getValueState() === ValueState.Success) {
                    // if there is no other validation error
                    input.setValueState(ValueState.Error).setValueStateText('Duplicate name');
                }
            });
        } else {
            // clear duplicates error
            inputs.forEach((input) => {
                if (input.getValueState() === ValueState.Error && input.getValueStateText() === 'Duplicate name') {
                    input.setValueState(ValueState.Success);
                }
            });
        }

        const beginBtn = this.dialog.getBeginButton();
        beginBtn.setEnabled(inputs.every((input) => input.getValueState() === ValueState.Success));
    }

    /**
     * Handles column fragment name input change
     *
     * @param event Event
     */
    onColumnFragmentNameInputChange(event: Event): void {
        // call parent method to update control state and show warning messages
        super.onFragmentNameInputChange(event);

        // update model value
        const input = event.getSource<Input>();
        let modelValue: string | null = input.getValue();
        if (modelValue.length < 1) {
            modelValue = null;
        }
        this.model.setProperty('/newColumnFragmentName', modelValue);
        this.updateFormState();
    }

    /**
     * Handles cell fragment name input change
     *
     * @param event Event
     */
    onCellFragmentNameInputChange(event: Event): void {
        // call parent method to update control state and show warning messages
        super.onFragmentNameInputChange(event);

        // update model value
        const input = event.getSource<Input>();
        let modelValue: string | null = input.getValue();
        if (input.getValue().length < 1) {
            modelValue = null;
        }
        this.model.setProperty('/newCellFragmentName', modelValue);

        this.updateFormState();
    }

    /**
     * Creates an addXML fragment command and pushes it to the command stack
     *
     * @param fragmentData Fragment Data
     */
    private async createFragmentChange(fragmentData: CreateFragmentProps): Promise<string[] | undefined> {
        const { fragments, index } = fragmentData;

        const flexSettings = this.rta.getFlexSettings();

        const overlay = OverlayRegistry.getOverlay(this.runtimeControl as UI5Element);
        const designMetadata = overlay.getDesignTimeMetadata();

        const result: string[] = [];

        const compositeCommand = await this.commandExecutor.createCompositeCommand(this.runtimeControl);

        for (const fragment of fragments) {
            const modifiedValue = {
                fragment: `<core:FragmentDefinition xmlns:core='sap.ui.core'></core:FragmentDefinition>`,
                fragmentPath: `fragments/${fragment.fragmentName}.fragment.xml`,
                index: index ?? 0,
                targetAggregation:
                    fragment.targetAggregation === ITEMS_AGGREGATION ? CELLS_AGGREGATION : fragment.targetAggregation
            };

            const targetObject =
                fragment.targetAggregation === COLUMNS_AGGREGATION
                    ? this.runtimeControl
                    : (this.runtimeControl.getAggregation(ITEMS_AGGREGATION) as ManagedObject[])[0];

            const command = await this.commandExecutor.getCommand<AddTableCellFragmentChangeContentType>(
                targetObject,
                'addXML',
                modifiedValue,
                designMetadata,
                flexSettings
            );

            const templateName =
                fragment.targetAggregation === COLUMNS_AGGREGATION ? `V2_SMART_TABLE_COLUMN` : 'V2_SMART_TABLE_CELL';
            const preparedChange = command.getPreparedChange();
            const content = { ...preparedChange.getContent(), templateName };
            preparedChange.setContent(content);
            compositeCommand.addCommand(command, false);
            result.push(templateName);
        }

        await this.commandExecutor.pushAndExecuteCommand(compositeCommand);
        CommunicationService.sendAction(setApplicationRequiresReload(true));

        return result;
    }
}

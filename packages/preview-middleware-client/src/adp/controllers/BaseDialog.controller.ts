import Dialog from 'sap/m/Dialog';
import Input from 'sap/m/Input';
import Event from 'sap/ui/base/Event';
import ManagedObject from 'sap/ui/base/ManagedObject';
import UI5Element from 'sap/ui/core/Element';
import { ValueState } from 'sap/ui/core/library';
import Controller from 'sap/ui/core/mvc/Controller';
import JSONModel from 'sap/ui/model/json/JSONModel';
import RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import CommandExecutor from '../command-executor';
import { checkForExistingChange } from '../utils';
import type { Fragments } from '../api-handler';
import ManagedObjectMetadata from 'sap/ui/base/ManagedObjectMetadata';
import { getControlById } from '../../utils/core';
import ControlUtils from '../control-utils';
import type ElementOverlay from 'sap/ui/dt/ElementOverlay';
import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';
import { QuickActionTelemetryData } from '../../cpe/quick-actions/quick-action-definition';
import { reportTelemetry } from '@sap-ux-private/control-property-editor-common';
import Log from 'sap/base/Log';

type BaseDialogModel = JSONModel & {
    getProperty(sPath: '/fragmentList'): Fragments;
};

/**
 * @namespace open.ux.preview.client.adp.controllers
 */
export default abstract class BaseDialog<T extends BaseDialogModel = BaseDialogModel> extends Controller {
    /**
     * Runtime Authoring
     */
    protected rta: RuntimeAuthoring;
    /**
     * Control Overlays
     */
    protected overlays: UI5Element;
    /**
     * JSON Model that has the data
     */
    public model: T;
    /**
     * Runtime control managed object
     */
    private _runtimeControl: ManagedObject;
    /**
     * Dialog instance
     */
    public dialog: Dialog;
    /**
     * RTA Command Executor
     */
    protected commandExecutor: CommandExecutor;

    abstract setup(dialog: Dialog): Promise<void>;

    abstract onCreateBtnPress(event: Event): Promise<void> | void;

    abstract buildDialogData(): Promise<void> | void;

    constructor(name: string, private readonly telemetryData?: QuickActionTelemetryData | undefined) {
        super(name);
    }
    public async onCreateBtnPressHandler(): Promise<void> {
        try {
            await reportTelemetry({ category: 'Dialog', dialogName: this.dialog.getId(), ...this.telemetryData });
        } catch (error) {
            Log.error('Error in reporting Telemetry:', error);
        }
    }

    protected getRuntimeControl(): ManagedObject {
        if (!this._runtimeControl && this.overlays) {
            const selectorId = this.overlays.getId();
            const overlayControl = getControlById(selectorId) as unknown as ElementOverlay;
            if (!overlayControl) {
                throw new Error('Cannot get overlay control');
            }
            this._runtimeControl = ControlUtils.getRuntimeControl(overlayControl);
        }
        return this._runtimeControl;
    }

    /**
     * Method is used in add fragment dialog controllers to get current control metadata which are needed on the dialog
     * @returns control metadata and target aggregations
     */
    protected getControlMetadata(): { controlMetadata: ManagedObjectMetadata; targetAggregation: string[] } {
        const controlMetadata: ManagedObjectMetadata = this.getRuntimeControl().getMetadata();
        if (!controlMetadata) {
            throw new Error('Cannot get control metadata');
        }

        const allAggregations = Object.keys(controlMetadata.getAllAggregations());
        const hiddenAggregations = ['customData', 'layoutData', 'dependents'];
        const targetAggregation = allAggregations.filter((item) => {
            if (hiddenAggregations.indexOf(item) === -1) {
                return item;
            }
            return false;
        });
        return { controlMetadata, targetAggregation };
    }

    /**
     * Fills indexArray from selected control children
     *
     * @param selectedControlChildren Array of numbers
     * @returns Array of key value pairs
     */
    protected fillIndexArray(selectedControlChildren: number[]) {
        let indexArray: { key: number; value: number }[] = [];
        if (selectedControlChildren.length === 0) {
            indexArray.push({ key: 0, value: 0 });
        } else {
            indexArray = selectedControlChildren.map((elem, index) => {
                return { key: index + 1, value: elem + 1 };
            });
            indexArray.unshift({ key: 0, value: 0 });
            indexArray.push({
                key: selectedControlChildren.length + 1,
                value: selectedControlChildren.length + 1
            });
        }
        return indexArray;
    }

    /**
     * Handles fragment name input change
     *
     * @param event Event
     */
    onFragmentNameInputChange(event: Event): void {
        const input = event.getSource<Input>();
        const beginBtn = this.dialog.getBeginButton();

        const fragmentName: string = input.getValue();
        const fragmentList: Fragments = this.model.getProperty('/fragmentList');

        const updateDialogState = (valueState: ValueState, valueStateText = '') => {
            input.setValueState(valueState).setValueStateText(valueStateText);
            beginBtn.setEnabled(valueState === ValueState.Success);
        };

        if (fragmentName.length <= 0) {
            updateDialogState(ValueState.None);
            this.model.setProperty('/newFragmentName', null);
            return;
        }

        const fileExists = fragmentList.some((f) => f.fragmentName === `${fragmentName}.fragment.xml`);

        if (fileExists) {
            updateDialogState(
                ValueState.Error,
                'Enter a different name. The fragment name that you entered already exists in your project.'
            );
            return;
        }

        const isValidName = /^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(fragmentName);

        if (!isValidName) {
            updateDialogState(ValueState.Error, 'The fragment name cannot contain white spaces or special characters.');
            return;
        }

        if (fragmentName.length > 64) {
            updateDialogState(ValueState.Error, 'A fragment file name cannot contain more than 64 characters.');
            return;
        }

        const changeExists = checkForExistingChange(
            this.rta,
            'addXMLAtExtensionPoint',
            'content.fragmentPath',
            `${fragmentName}.fragment.xml`
        );

        if (changeExists) {
            updateDialogState(
                ValueState.Error,
                'Enter a different name. The fragment name entered matches the name of an unsaved fragment.'
            );
            return;
        }
        // 'changes.fragments' is the current folder structure where fragment changes are written.
        // following value is subjected to change if the folder structure changes
        const template = `${this.rta.getFlexSettings()?.projectId}.changes.fragments.${fragmentName}`;
        const v4CustomXMLChange = checkForExistingChange(
            this.rta,
            'appdescr_fe_changePageConfiguration',
            'content.entityPropertyChange.propertyValue.template',
            template
        );

        if (v4CustomXMLChange) {
            updateDialogState(
                ValueState.Error,
                'Enter a different name. The fragment name entered matches the name of an unsaved fragment.'
            );
            return;
        }

        updateDialogState(ValueState.Success);
        this.model.setProperty('/newFragmentName', fragmentName);
    }

    /**
     * Sets custom function that fires when user presses escape key.
     */
    setEscapeHandler() {
        this.dialog.setEscapeHandler(({ resolve }) => {
            this.handleDialogClose();
            resolve();
        });
    }

    /**
     * Handles the dialog closing and destruction of it.
     */
    handleDialogClose() {
        this.dialog.close();
        this.dialog.destroy();
    }

    /**
     * Handles the index field whenever a specific aggregation is chosen
     *
     * @param specialIndexAggregation string | number
     */
    protected specialIndexHandling(specialIndexAggregation: string | number): void {
        const overlay = OverlayRegistry.getOverlay(this.getRuntimeControl() as UI5Element);
        const aggregations = overlay.getDesignTimeMetadata().getData().aggregations;

        if (
            specialIndexAggregation in aggregations &&
            'specialIndexHandling' in aggregations[specialIndexAggregation]
        ) {
            const controlType = this.getRuntimeControl().getMetadata().getName();
            this.model.setProperty('/indexHandlingFlag', false);
            this.model.setProperty('/specialIndexHandlingIcon', true);
            this.model.setProperty(
                '/iconTooltip',
                `Index is defined by special logic of ${controlType} and can't be set here`
            );
        } else {
            this.model.setProperty('/indexHandlingFlag', true);
            this.model.setProperty('/specialIndexHandlingIcon', false);
            this.model.setProperty('/specialIndexHandlingIconPressed', false);
        }
    }
}

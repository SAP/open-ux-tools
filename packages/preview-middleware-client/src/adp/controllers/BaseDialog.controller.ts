import Dialog from 'sap/m/Dialog';
import Input from 'sap/m/Input';
import Event from 'sap/ui/base/Event';
import ManagedObject from 'sap/ui/base/ManagedObject';
import UI5Element from 'sap/ui/core/Element';
import { ValueState } from 'sap/ui/core/library';
import Controller from 'sap/ui/core/mvc/Controller';
import JSONModel from 'sap/ui/model/json/JSONModel';
import RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import MessageToast from 'sap/m/MessageToast';
import CommandExecutor from '../command-executor';
import { matchesFragmentName } from '../utils';
import type { Fragments } from '../api-handler';
import { getError } from '../../utils/error';
import ManagedObjectMetadata from 'sap/ui/base/ManagedObjectMetadata';
import { getControlById } from '../../utils/core';
import ControlUtils from '../control-utils';
import type ElementOverlay from 'sap/ui/dt/ElementOverlay';
import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';

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
    protected runtimeControl: ManagedObject;
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

    /**
     * Method is used in add fragment dialog controllers to get current control metadata which are needed on the dialog
     * @returns control metadata and target aggregations
     */
    protected getControlMetadata(): { controlMetadata: ManagedObjectMetadata; targetAggregation: string[] } {
        const selectorId = this.overlays.getId();

        let controlMetadata: ManagedObjectMetadata;

        const overlayControl = getControlById(selectorId) as unknown as ElementOverlay;
        if (overlayControl) {
            this.runtimeControl = ControlUtils.getRuntimeControl(overlayControl);
            controlMetadata = this.runtimeControl.getMetadata();
        } else {
            throw new Error('Cannot get overlay control');
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

        const changeExists = this.checkForExistingChange(fragmentName);

        if (changeExists) {
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
     * Checks for the existence of a change associated with a specific fragment name in the RTA command stack.
     *
     * @param {string} fragmentName - The name of the fragment to check for existing changes.
     * @returns {Promise<boolean>} A promise that resolves to `true` if a matching change is found, otherwise `false`.
     */
    checkForExistingChange(fragmentName: string): boolean {
        const allCommands = this.rta.getCommandStack().getCommands();

        return allCommands.some((command: FlexCommand) => {
            if (typeof command.getCommands === 'function') {
                const addXmlCommand = command
                    .getCommands()
                    .find((c: FlexCommand) => c?.getProperty('name') === 'addXMLAtExtensionPoint');

                return addXmlCommand && matchesFragmentName(addXmlCommand, fragmentName);
            } else {
                return matchesFragmentName(command, fragmentName);
            }
        });
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
     * Function that handles runtime thrown errors with MessageToast
     *
     * @param e error instance
     * @throws {Error}.
     */
    protected handleError(e: unknown): void {
        const error = getError(e);
        MessageToast.show(error.message, { duration: 5000 });
        throw error;
    }

    /**
     * Handles the index field whenever a specific aggregation is chosen
     *
     * @param specialIndexAggregation string | number
     */
    protected specialIndexHandling(specialIndexAggregation: string | number): void {
        const overlay = OverlayRegistry.getOverlay(this.runtimeControl as UI5Element);
        const aggregations = overlay.getDesignTimeMetadata().getData().aggregations;

        if (
            specialIndexAggregation in aggregations &&
            'specialIndexHandling' in aggregations[specialIndexAggregation]
        ) {
            const controlType = this.runtimeControl.getMetadata().getName();
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

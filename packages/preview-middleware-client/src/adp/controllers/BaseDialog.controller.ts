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

/**
 * @namespace open.ux.preview.client.adp.controllers
 */
export default abstract class BaseDialog extends Controller {
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
    public model: JSONModel;
    /**
     * Runtime control managed object
     */
    protected runtimeControl: ManagedObject;
    /**
     * Dialog instance
     */
    public dialog: Dialog;
    /**
     * UI5 version
     */
    public ui5Version: string;
    /**
     * RTA Command Executor
     */
    protected commandExecutor: CommandExecutor;

    abstract setup(dialog: Dialog): Promise<void>;

    abstract onCreateBtnPress(event: Event): Promise<void>;

    abstract buildDialogData(): Promise<void>;

    /**
     * Handles fragment name input change
     *
     * @param event Event
     */
    onFragmentNameInputChange(event: Event) {
        const input = event.getSource<Input>();
        const beginBtn = this.dialog.getBeginButton();

        const fragmentName: string = input.getValue();
        const fragmentList: { fragmentName: string }[] = this.model.getProperty('/fragmentList');

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
}

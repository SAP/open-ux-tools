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
     * RTA Command Executor
     */
    protected commandExecutor: CommandExecutor;

    abstract onCreateBtnPress(event: Event): Promise<void>;

    abstract buildDialogData(): Promise<void>;

    /**
     * Handles fragment name input change
     *
     * @param event Event
     */
    onFragmentNameInputChange(event: Event) {
        const source = event.getSource<Input>();

        const fragmentName: string = source.getValue().trim();
        const fragmentList: { fragmentName: string }[] = this.model.getProperty('/fragmentList');

        if (fragmentName.length <= 0) {
            this.setInputValidation(source, ValueState.None, false, '');
            this.model.setProperty('/newFragmentName', null);
        } else {
            const fileExists = fragmentList.find(
                (f: { fragmentName: string }) => f.fragmentName === `${fragmentName}.fragment.xml`
            );

            if (fileExists) {
                this.setInputValidation(
                    source,
                    ValueState.Error,
                    false,
                    'Enter a different name. The fragment name that you entered already exists in your project.'
                );
                return;
            }

            const isValidName = /^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(fragmentName);

            if (!isValidName) {
                this.setInputValidation(
                    source,
                    ValueState.Error,
                    false,
                    'A Fragment Name cannot contain white spaces or special characters.'
                );
            } else {
                this.setInputValidation(source, ValueState.Success, true, '');
                this.model.setProperty('/newFragmentName', fragmentName);
            }
        }
    }

    /**
     * Sets validation properties for an input field and enables/disables a dialog button.
     *
     * @param source The input field to set validation properties for.
     * @param valueState The validation state for the input field (e.g., 'Error', 'Warning', 'Success').
     * @param enabled `true` to enable the dialog button, `false` to disable it.
     * @param stateText The text associated with the validation state to display as a tooltip or message.
     */
    setInputValidation(source: Input, valueState: ValueState, enabled: boolean, stateText: string) {
        source.setValueState(valueState);
        source.setValueStateText(stateText);
        this.dialog.getBeginButton().setEnabled(enabled);
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
        this.getView()?.destroy();
    }
}

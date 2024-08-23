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
     * UI5 version
     */
    public ui5Version: string;
    /**
     * RTA Command Executor
     */
    protected commandExecutor: CommandExecutor;

    abstract setup(dialog: Dialog): Promise<void>;

    abstract onCreateBtnPress(event: Event): Promise<void> | void;

    abstract buildDialogData(): Promise<void>;

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
}

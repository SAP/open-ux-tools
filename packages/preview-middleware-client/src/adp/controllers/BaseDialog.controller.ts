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
            this.dialog.getBeginButton().setEnabled(false);
            source.setValueState(ValueState.None);
            this.model.setProperty('/newFragmentName', null);
        } else {
            const fileExists = fragmentList.find((f: { fragmentName: string }) => {
                return f.fragmentName === `${fragmentName}.fragment.xml`;
            });

            const isValidName = /^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(fragmentName);

            if (fileExists) {
                source.setValueState(ValueState.Error);
                source.setValueStateText(
                    'Enter a different name. The fragment name that you entered already exists in your project.'
                );
                this.dialog.getBeginButton().setEnabled(false);
            } else if (!isValidName) {
                source.setValueState(ValueState.Error);
                source.setValueStateText('A Fragment Name cannot contain white spaces or special characters.');
                this.dialog.getBeginButton().setEnabled(false);
            } else {
                this.dialog.getBeginButton().setEnabled(true);
                source.setValueState(ValueState.None);
                this.model.setProperty('/newFragmentName', fragmentName);
            }
        }
    }

    /**
     * Handles the dialog closing and destruction of it
     */
    handleDialogClose() {
        this.dialog.close();
        this.getView()?.destroy();
    }
}

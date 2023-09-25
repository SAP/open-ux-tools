import Dialog from 'sap/m/Dialog';
import Event from 'sap/ui/base/Event';
import ManagedObject from 'sap/ui/base/ManagedObject';
import UI5Element from 'sap/ui/core/Element';
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
     * Handles the dialog closing and destruction of it
     */
    handleDialogClose() {
        this.dialog.close();
        this.getView()?.destroy();
    }
}

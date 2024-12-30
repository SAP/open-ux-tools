import JSONModel from 'sap/ui/model/json/JSONModel';
import type Dialog from 'sap/m/Dialog';

import type Event from 'sap/ui/base/Event';

import type SimpleForm from 'sap/ui/layout/form/SimpleForm';

export interface FileExistsDialogOptions {
    title: string;
    fileName: string;
    filePath: string;
    isRunningInBAS: boolean;
}

/**
 * @namespace open.ux.preview.client.adp.controllers
 */
export default class ShowFileExistDialog {
    private options: FileExistsDialogOptions;
    public model: JSONModel;
    public dialog: Dialog;
    private _name: string;
    constructor(name: string, options: FileExistsDialogOptions) {
        this._name = name;
        this.model = new JSONModel();
        this.options = options;
    }

    /**
     * Setups the Dialog and the JSON Model
     *
     * @param {Dialog} dialog - Dialog instance
     */
    setup(dialog: Dialog): void {
        this.dialog = dialog;

        this.model.setProperty('/filePath', this.options.filePath);
        this.model.setProperty('/filePathFromRoot', this.options.fileName);
        this.model.setProperty('/isRunningInBAS', this.options.isRunningInBAS);
        this.buildDialogData();

        this.dialog.setModel(this.model);

        this.dialog.open();
    }

    /**
     * Handles create button press
     *
     * @param _event Event
     */
    onShowFileInVscodeBtn(_event: Event) {
        const annotationPath = this.model.getProperty('/filePath');
        window.open(`vscode://file${annotationPath}`);

        this.handleDialogClose();
    }

    handleDialogClose() {
        this.dialog.close();
        this.dialog.destroy();
    }

    /**
     * Builds data that is used in the dialog.
     */
    buildDialogData(): void {
        const content = this.dialog.getContent();

        const messageForm = content[0] as SimpleForm;
        messageForm.setVisible(true);

        const isRunningInBAS = this.model.getProperty('/isRunningInBAS');
        if (isRunningInBAS) {
            this.dialog.getBeginButton().setVisible(false);
        } else {
            this.dialog.getBeginButton().setText('Open in VS Code').setEnabled(true);
        }
        this.dialog.getEndButton().setText('Close');
    }
}

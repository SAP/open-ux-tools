import JSONModel from 'sap/ui/model/json/JSONModel';
import type Dialog from 'sap/m/Dialog';

import type Event from 'sap/ui/base/Event';

import type SimpleForm from 'sap/ui/layout/form/SimpleForm';
import BaseDialog from './BaseDialog.controller';
import { getResourceModel } from '../../i18n';

export interface FileExistsDialogOptions {
    title: string;
    fileName: string;
    filePath: string;
    isRunningInBAS: boolean;
}

type FileExistModel = JSONModel & {
    getProperty(sPath: '/filePath'): string;
    getProperty(sPath: '/filePathFromRoot'): string;
    getProperty(sPath: '/isRunningInBAS'): boolean;
};

/**
 * @namespace open.ux.preview.client.adp.controllers
 */
export default class FileExistsDialog extends BaseDialog<FileExistModel> {
    private options: FileExistsDialogOptions;
    public model: JSONModel;
    constructor(name: string, options: FileExistsDialogOptions) {
        super(name);
        this.model = new JSONModel();
        this.options = options;
    }

    /**
     * Setups the Dialog and the JSON Model
     *
     * @param {Dialog} dialog - Dialog instance
     */
    async setup(dialog: Dialog): Promise<void> {
        this.dialog = dialog;
        this.setEscapeHandler();
        this.model.setProperty('/filePath', this.options.filePath);
        this.model.setProperty('/filePathFromRoot', this.options.fileName);
        this.model.setProperty('/isRunningInBAS', this.options.isRunningInBAS);
        this.buildDialogData();
        const resourceModel = await getResourceModel();
        this.dialog.setModel(this.model);
        this.dialog.setModel(resourceModel, 'i18n');
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
        }
    }

    /**
     * Handles create button press
     *
     * @param _event Event
     */
    onCreateBtnPress(_event: Event): Promise<void> | void {}
}

import Dialog from 'sap/m/Dialog';
import UI5Element from 'sap/ui/core/Element';
import Fragment from 'sap/ui/core/Fragment';
import RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

import { getTextBundle } from '../i18n';

import AddFragment, { AddFragmentOptions } from './controllers/AddFragment.controller';
import AddTableColumnFragments from './controllers/AddTableColumnFragments.controller';
import ControllerExtension from './controllers/ControllerExtension.controller';
import ExtensionPoint from './controllers/ExtensionPoint.controller';

import type { ExtensionPointData } from './extension-point';
import { AddFragmentData } from './add-fragment';
import { ExtendControllerData } from './extend-controller';
import FileExistsDialog, { FileExistsDialogOptions } from './controllers/FileExistsDialog.controller';
import AddSubpage, { AddSubpageOptions } from './controllers/AddSubpage.controller';
import { QuickActionTelemetryData } from '../cpe/quick-actions/quick-action-definition';
import AddCustomFragment, { AddCustomFragmentOptions } from './controllers/AddCustomFragment.controller';

export const enum DialogNames {
    ADD_FRAGMENT = 'AddFragment',
    ADD_TABLE_COLUMN_FRAGMENTS = 'AddTableColumnFragments',
    CONTROLLER_EXTENSION = 'ControllerExtension',
    ADD_FRAGMENT_AT_EXTENSION_POINT = 'ExtensionPoint',
    ADD_CUSTOM_FRAGMENT = 'AddCustomFragment',
    FILE_EXISTS = 'FileExistsDialog',
    ADD_SUBPAGE = 'AddSubpage'
}

type Controller =
    | AddFragment
    | AddTableColumnFragments
    | ControllerExtension
    | ExtensionPoint
    | FileExistsDialog
    | AddSubpage
    | AddCustomFragment;

type DialogData = ExtensionPointData | AddFragmentData | ExtendControllerData;

export const OPEN_DIALOG_STATUS_CHANGED = 'OPEN_DIALOG_STATUS_CHANGED';

export class DialogFactory {
    private static readonly eventTarget = new EventTarget();
    private static isDialogOpen = false;
    /**
     * Only one dialog can be open at a time. This flag indicates if a new dialog can be opened.
     */

    public static get canOpenDialog(): boolean {
        return !this.isDialogOpen;
    }

    /**
     * Factory method for creating a new dialog.
     *
     * @param overlay - Control overlay.
     * @param rta - Runtime Authoring instance.
     * @param dialogName - Dialog name.
     * @param data - Data to be passed to the dialog.
     * @param options - Dialog options.
     * @param telemetryData - Telemetry data.
     */
    public static async createDialog(
        overlay: UI5Element,
        rta: RuntimeAuthoring,
        dialogName: DialogNames,
        data?: DialogData,
        options:
            | Partial<AddFragmentOptions>
            | Partial<FileExistsDialogOptions>
            | AddCustomFragmentOptions
            | AddSubpageOptions = {},
        telemetryData?: QuickActionTelemetryData
    ): Promise<void> {
        if (this.isDialogOpen) {
            return;
        }
        let controller: Controller;
        const resources = await getTextBundle();

        switch (dialogName) {
            case DialogNames.ADD_FRAGMENT:
                controller = new AddFragment(
                    `open.ux.preview.client.adp.controllers.${dialogName}`,
                    overlay,
                    rta,
                    {
                        ...('aggregation' in options && { aggregation: options.aggregation }),
                        ...('defaultAggregationArrayIndex' in options && {
                            defaultAggregationArrayIndex: options.defaultAggregationArrayIndex
                        }),
                        title: resources.getText(options.title ?? 'ADP_ADD_FRAGMENT_DIALOG_TITLE')
                    },
                    data as AddFragmentData,
                    telemetryData
                );
                break;
            case DialogNames.ADD_CUSTOM_FRAGMENT:
                controller = new AddCustomFragment(
                    `open.ux.preview.client.adp.controllers.${dialogName}`,
                    overlay,
                    rta,
                    {
                        ...options,
                        title: resources.getText(options.title ?? 'ADP_ADD_FRAGMENT_DIALOG_TITLE')
                    } as AddCustomFragmentOptions
                );
                break;
            case DialogNames.ADD_TABLE_COLUMN_FRAGMENTS:
                controller = new AddTableColumnFragments(
                    `open.ux.preview.client.adp.controllers.${dialogName}`,
                    overlay,
                    rta,
                    {
                        ...('aggregation' in options && { aggregation: options.aggregation }),
                        title: resources.getText(options.title ?? 'ADP_ADD_FRAGMENT_DIALOG_TITLE')
                    },
                    telemetryData
                );
                break;
            case DialogNames.CONTROLLER_EXTENSION:
                controller = new ControllerExtension(
                    `open.ux.preview.client.adp.controllers.${dialogName}`,
                    overlay,
                    rta,
                    data as ExtendControllerData,
                    telemetryData
                );
                break;
            case DialogNames.ADD_FRAGMENT_AT_EXTENSION_POINT:
                controller = new ExtensionPoint(
                    `open.ux.preview.client.adp.controllers.${dialogName}`,
                    overlay,
                    rta,
                    data as ExtensionPointData
                );
                break;
            case DialogNames.FILE_EXISTS:
                controller = new FileExistsDialog(
                    `open.ux.preview.client.adp.controllers.${dialogName}`,
                    options as FileExistsDialogOptions
                );
                break;
            case DialogNames.ADD_SUBPAGE:
                controller = new AddSubpage(`open.ux.preview.client.adp.controllers.${dialogName}`, overlay, rta, {
                    ...options,
                    title: resources.getText(options.title ?? 'ADD_SUB_PAGE_DIALOG_TITLE')
                } as AddSubpageOptions);
                break;
        }

        const id = dialogName === DialogNames.ADD_FRAGMENT_AT_EXTENSION_POINT ? `dialog--${dialogName}` : undefined;

        const dialog = (await Fragment.load({
            name: `open.ux.preview.client.adp.ui.${dialogName}`,
            controller,
            id
        })) as Dialog;

        this.isDialogOpen = true;
        dialog.attachBeforeClose(() => {
            this.updateStatus(false);
        });

        await controller.setup(dialog);
        this.updateStatus(true);
    }

    /**
     * Updates open dialog status.
     *
     * @param isDialogOpen Flag indicating if there is an open dialog.
     */
    private static updateStatus(isDialogOpen: boolean) {
        this.isDialogOpen = isDialogOpen;
        const event = new CustomEvent(OPEN_DIALOG_STATUS_CHANGED);
        this.eventTarget.dispatchEvent(event);
    }

    /**
     * Attach event handler for OPEN_DIALOG_STATUS_CHANGED event.
     *
     * @param handler Event handler.
     * @returns Function that removes listener.
     */
    public static onOpenDialogStatusChange(handler: (event: CustomEvent) => void | Promise<void>): () => void {
        this.eventTarget.addEventListener(OPEN_DIALOG_STATUS_CHANGED, handler as EventListener);
        return () => {
            this.eventTarget.removeEventListener(OPEN_DIALOG_STATUS_CHANGED, handler as EventListener);
        };
    }
}

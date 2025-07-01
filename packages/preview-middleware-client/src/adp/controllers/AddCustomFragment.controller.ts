/** sap.m */
import Button from 'sap/m/Button';
import type Dialog from 'sap/m/Dialog';

/** sap.ui.core */
import type UI5Element from 'sap/ui/core/Element';

/** sap.ui.base */
import type Event from 'sap/ui/base/Event';

/** sap.ui.model */
import JSONModel from 'sap/ui/model/json/JSONModel';

/** sap.ui.rta */
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

import { getResourceModel, getTextBundle } from '../../i18n';
import CommandExecutor from '../command-executor';
import { getFragments } from '../api-handler';
import BaseDialog from './BaseDialog.controller';
import { notifyUser } from '../utils';
import { QuickActionTelemetryData } from '../../cpe/quick-actions/quick-action-definition';
import { setApplicationRequiresReload } from '@sap-ux-private/control-property-editor-common';
import { CommunicationService } from '../../cpe/communication-service';
import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import type AppComponentV4 from 'sap/fe/core/AppComponent';

export type AddFragmentModel = JSONModel & {
    getProperty(sPath: '/title'): string;
    getProperty(sPath: '/newFragmentName'): string;
};
export interface PageDescriptorV4 {
    appType: 'fe-v4';
    appComponent: AppComponentV4;
    pageId: string;
    projectId: string;
    anchor: string;
}

export interface AddCustomFragmentOptions {
    title: string;
    propertyPath: string;
    appDescriptor?: PageDescriptorV4;
}

/**
 * @namespace open.ux.preview.client.adp.controllers
 */
export default class AddCustomFragment extends BaseDialog<AddFragmentModel> {
    constructor(
        name: string,
        overlays: UI5Element,
        rta: RuntimeAuthoring,
        readonly options: AddCustomFragmentOptions,
        telemetryData?: QuickActionTelemetryData
    ) {
        super(name, telemetryData);
        this.rta = rta;
        this.overlays = overlays;
        this.model = new JSONModel({
            title: options.title
        });
        this.commandExecutor = new CommandExecutor(this.rta);
    }

    /**
     * Setups the Dialog and the JSON Model
     *
     * @param {Dialog} dialog - Dialog instance
     */
    async setup(dialog: Dialog): Promise<void> {
        this.dialog = dialog;

        this.setEscapeHandler();
        await this.buildDialogData();
        const resourceModel = await getResourceModel('open.ux.preview.client');

        this.dialog.setModel(resourceModel, 'i18n');
        this.dialog.setModel(this.model);

        this.dialog.open();
    }

    /**
     * Handles create button press
     *
     * @param event Event
     */
    async onCreateBtnPress(event: Event) {
        const source = event.getSource<Button>();
        source.setEnabled(false);

        await super.onCreateBtnPressHandler();

        const fragmentName = this.model.getProperty('/newFragmentName');
        const template = `fragments.${fragmentName}`;
        await this.createAppDescriptorChangeForV4(template);
        CommunicationService.sendAction(setApplicationRequiresReload(true));

        const bundle = await getTextBundle();
        notifyUser(bundle.getText('ADP_ADD_FRAGMENT_NOTIFICATION', [fragmentName]), 8000);

        this.handleDialogClose();
    }

    /**
     * Builds data that is used in the dialog
     */
    async buildDialogData(): Promise<void> {
        try {
            const { fragments } = await getFragments();
            this.model.setProperty('/fragmentList', fragments);
        } catch (e) {
            this.handleError(e);
        }
    }

    private async createAppDescriptorChangeForV4(templatePath: string) {
        const fragmentName = this.model.getProperty('/newFragmentName');
        const template = `${this.options.appDescriptor?.projectId}.changes.${templatePath}`;
        let sectionId = this.options.appDescriptor?.anchor;
        const flexSettings = this.rta.getFlexSettings();
        const modifiedValue = {
            reference: this.options.appDescriptor?.projectId,
            appComponent: this.options.appDescriptor?.appComponent,
            changeType: 'appdescr_fe_changePageConfiguration',
            parameters: {
                page: this.options.appDescriptor?.pageId,
                entityPropertyChange: {
                    propertyPath: `${this.options.propertyPath}${fragmentName}`, // e.g. 'content/body/sections/test'
                    operation: 'UPSERT',
                    propertyValue: {
                        template,
                        title: 'New Custom Section',
                        position: {
                            placement: 'After',
                            anchor: `${sectionId}`
                        }
                    }
                }
            }
        };
        const command = await this.commandExecutor.getCommand<FlexCommand>(
            this.getRuntimeControl(),
            'appDescriptor',
            modifiedValue,
            flexSettings
        );

        await this.commandExecutor.pushAndExecuteCommand(command);
    }
}

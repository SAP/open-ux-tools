/** sap.m */
import Button from 'sap/m/Button';
import type Dialog from 'sap/m/Dialog';
import type ComboBox from 'sap/m/ComboBox';

/** sap.ui.core */
import type UI5Element from 'sap/ui/core/Element';

/** sap.ui.base */
import type Event from 'sap/ui/base/Event';

/** sap.ui.model */
import JSONModel from 'sap/ui/model/json/JSONModel';

/** sap.ui.rta */
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

/** sap.fe.core */
import type AppComponentV4 from 'sap/fe/core/AppComponent';

/** sap.suite.ui.generic */
import type AppComponentV2 from 'sap/suite/ui/generic/template/lib/AppComponent';

import { getResourceModel } from '../../i18n';

import CommandExecutor from '../command-executor';

import BaseDialog from './BaseDialog.controller';

import CommandFactory from 'sap/ui/rta/command/CommandFactory';
import { CommunicationService } from '../../cpe/communication-service';
import { setApplicationRequiresReload } from '@sap-ux-private/control-property-editor-common';
import { generateRoutePattern } from '../quick-actions/fe-v4/utils';
import { QuickActionTelemetryData } from '../../cpe/quick-actions/quick-action-definition';

type SubpageType = 'ObjectPage' | 'CustomPage';

export interface PageDescriptorV2 {
    appType: 'fe-v2';
    appComponent: AppComponentV2;
    entitySet: string;
    pageType: string;
}

export interface PageDescriptorV4 {
    appType: 'fe-v4';
    appComponent: AppComponentV4;
    pageId: string;
    routePattern: string;
}

export interface AddSubpageOptions {
    appReference: string;
    title: string;
    navProperties: { navProperty: string; entitySet: string }[];
    pageDescriptor: PageDescriptorV2 | PageDescriptorV4;
}

export type AddSubpageModel = JSONModel & {
    getProperty(sPath: '/title'): string;
    getProperty(sPath: '/navigationData'): { navProperty: string; entitySet: string }[];
    getProperty(sPath: '/selectedPageType/key'): SubpageType;
    getProperty(sPath: '/selectedNavigation/key'): string;
};

/**
 * @namespace open.ux.preview.client.adp.controllers
 */
export default class AddSubpage extends BaseDialog<AddSubpageModel> {
    constructor(
        name: string,
        overlays: UI5Element,
        rta: RuntimeAuthoring,
        readonly options: AddSubpageOptions,
        telemetryData?: QuickActionTelemetryData
    ) {
        super(name, telemetryData);
        this.rta = rta;
        this.overlays = overlays;
        this.model = new JSONModel({
            title: options.title,
            navigationData: options.navProperties
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

    onPageTypeChange() {
        // TODO: to be supported in future releases
    }

    onNavigationChange(event: Event) {
        const source = event.getSource<ComboBox>();
        const selectedKey = source.getSelectedKey();
        this.model.setProperty('/selectedNavigation/key', selectedKey);
    }

    /**
     * Handles create button press
     *
     * @param event Event
     */
    async onCreateBtnPress(event: Event) {
        await super.onCreateBtnPressHandler();
        const source = event.getSource<Button>();
        source.setEnabled(false);

        const flexSettings = this.rta.getFlexSettings();
        const navProperty = this.model.getProperty('/selectedNavigation/key');
        const navigation = this.model.getProperty('/navigationData').find((item) => (item.navProperty = navProperty));
        const targetEntitySet = navigation?.entitySet ?? '';

        const pageDescriptor = this.options.pageDescriptor;

        let modifiedValue;
        if (pageDescriptor.appType === 'fe-v2') {
            modifiedValue = {
                appComponent: pageDescriptor.appComponent,
                changeType: 'appdescr_ui_generic_app_addNewObjectPage',
                reference: this.options.appReference,
                parameters: {
                    parentPage: {
                        component: pageDescriptor.pageType,
                        entitySet: pageDescriptor.entitySet
                    },
                    childPage: {
                        id: `ObjectPage|${navProperty}`,
                        definition: {
                            entitySet: targetEntitySet,
                            navigationProperty: navProperty
                        }
                    }
                }
            };
        } else {
            const routePattern = generateRoutePattern(pageDescriptor.routePattern, navProperty, targetEntitySet);
            modifiedValue = {
                appComponent: pageDescriptor.appComponent,
                changeType: 'appdescr_fe_addNewPage',
                reference: this.options.appReference,
                parameters: {
                    sourcePage: {
                        id: pageDescriptor.pageId,
                        navigationSource: navProperty
                    },
                    targetPage: {
                        type: 'Component',
                        id: `${targetEntitySet}ObjectPage`,
                        name: 'sap.fe.templates.ObjectPage',
                        routePattern,
                        settings: {
                            contextPath: `/${targetEntitySet}`,
                            editableHeaderContent: false,
                            entitySet: targetEntitySet,
                            pageLayout: '',
                            controlConfiguration: {}
                        }
                    }
                }
            };
        }

        const command = await CommandFactory.getCommandFor(
            this.runtimeControl,
            'appDescriptor',
            modifiedValue,
            null,
            flexSettings
        );

        await this.commandExecutor.pushAndExecuteCommand(command);
        CommunicationService.sendAction(setApplicationRequiresReload(true));

        this.handleDialogClose();
    }

    /**
     * Builds data that is used in the dialog
     */
    async buildDialogData(): Promise<void> {
        this.getControlMetadata(); // is called to fill this.runtimeControl

        const pageTypeOptions: { key: string; value: string }[] = [
            { key: 'ObjectPage', value: 'Object Page' },
            { key: 'CustomPage', value: 'Custom Page' }
        ];
        this.model.setProperty('/pageTypeOptions', pageTypeOptions);
        this.model.setProperty('/selectedPageType', pageTypeOptions[0]);

        const navigationOptions: { key: string; value: string }[] = (
            this.model.getProperty('/navigationData') as { navProperty: string; entitySet: string }[]
        ).map((item) => {
            const value =
                item.entitySet === item.navProperty ? item.entitySet : `${item.entitySet} (${item.navProperty})`;
            return { key: item.navProperty, value };
        });
        this.model.setProperty('/navigationOptions', navigationOptions);
        this.model.setProperty('/selectedNavigation', navigationOptions[0]);

        return Promise.resolve();
    }
}

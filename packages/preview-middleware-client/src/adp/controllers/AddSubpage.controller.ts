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

import { getResourceModel } from '../../i18n';

import CommandExecutor from '../command-executor';

import BaseDialog from './BaseDialog.controller';

import CommandFactory from 'sap/ui/rta/command/CommandFactory';
import { ApplicationType } from '../../utils/application';
import { CommunicationService } from '../../cpe/communication-service';
import { setApplicationRequiresReload } from '@sap-ux-private/control-property-editor-common';

type SubpageType = 'ObjectPage' | 'CustomPage';

export type AddSubpageModel = JSONModel & {
    getProperty(sPath: '/appType'): ApplicationType;
    getProperty(sPath: '/pageType'): string;
    getProperty(sPath: '/appReference'): string;
    getProperty(sPath: '/currentEntitySet'): string;
    getProperty(sPath: '/title'): string;
    getProperty(sPath: '/navigationData'): { navProperty: string; entitySet: string }[];
    getProperty(sPath: '/selectedPageType/key'): SubpageType;
    getProperty(sPath: '/selectedNavigation/key'): string;
};

export interface AddSubpageOptions {
    appType: ApplicationType;
    appReference: string;
    title: string;
    pageDescriptor: {
        pageType: string;
        entitySet: string;
        navProperties: { navProperty: string; entitySet: string }[]; 
    } 
}

/**
 * @namespace open.ux.preview.client.adp.controllers
 */
export default class AddSubpage extends BaseDialog<AddSubpageModel> {
    constructor(name: string, overlays: UI5Element, rta: RuntimeAuthoring, readonly options: AddSubpageOptions) {
        super(name);
        this.rta = rta;
        this.overlays = overlays;
        this.model = new JSONModel({
            appType: options.appType,
            appReference: options.appReference,
            pageType: options.pageDescriptor.pageType,
            title: options.title,
            navigationData: options.pageDescriptor.navProperties,
            currentEntitySet: options.pageDescriptor.entitySet
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
        const source = event.getSource<Button>();
        source.setEnabled(false);

        const flexSettings = this.rta.getFlexSettings();
        const navProperty = this.model.getProperty('/selectedNavigation/key');
        const navigation = this.model.getProperty('/navigationData').find((item) => (item.navProperty = navProperty));
        const targetEntitySet = navigation?.entitySet ?? '';
        const appType = this.model.getProperty('/appType');
        const pageType = this.model.getProperty('/pageType');

        const modifiedValue =
            appType === 'fe-v2'
                ? {
                      changeType: 'appdescr_ui_generic_app_addNewObjectPage',
                      reference: this.model.getProperty('/appReference'),
                      parameters: {
                          parentPage: {
                              component: pageType,
                              entitySet: this.model.getProperty('/currentEntitySet')
                          },
                          childPage: {
                              id: `ObjectPage|${navProperty}`,
                              definition: {
                                  entitySet: targetEntitySet,
                                  navigationProperty: navProperty
                              }
                          }
                      }
                  }
                : {
                      changeType: 'appdescr_fe_addNewPage',
                      parameters: {
                          sourcePage: {
                              id: this.runtimeControl.getId(),
                              navigationSource: targetEntitySet
                          },
                          targetPage: {
                              type: 'Component',
                              id: `${targetEntitySet}ObjectPage`,
                              name: 'sap.fe.templates.ObjectPage',
                              routePattern: `${targetEntitySet}({key}):?query:`,
                              settings: {
                                  contextPath: `/${targetEntitySet}`,
                                  editableHeaderContent: false
                              }
                          }
                      }
                  };

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

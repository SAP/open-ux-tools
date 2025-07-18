import Component from 'sap/ui/core/Component';
import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import ObjectPageLayout from 'sap/uxap/ObjectPageLayout';
import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';

import { QuickActionContext, SimpleQuickActionDefinition } from '../../cpe/quick-actions/quick-action-definition';
import { pageHasControlId } from '../../cpe/quick-actions/utils';
import { getControlById } from '../../utils/core';
import { DialogFactory, DialogNames } from '../dialog-factory';
import { EnablementValidatorResult } from './enablement-validator';
import { getTextBundle } from '../../i18n';
import { SimpleQuickActionDefinitionBase } from './simple-quick-action-base';
import { DIALOG_ENABLEMENT_VALIDATOR } from './dialog-enablement-validator';
import { PageDescriptorV2, PageDescriptorV4 } from '../controllers/AddSubpage.controller';

export const ADD_NEW_OBJECT_PAGE_ACTION = 'add-new-subpage';
const CONTROL_TYPES = ['sap.f.DynamicPage', 'sap.uxap.ObjectPageLayout'];

export interface ApplicationPageData {
    id: string;
    entitySet?: string;
    contextPath?: string;
}

/**
 * Base Quick Action class for adding a custom page action.
 */
export abstract class AddNewSubpageBase<ODataMetaModelType>
    extends SimpleQuickActionDefinitionBase
    implements SimpleQuickActionDefinition
{
    protected appReference: string;
    protected abstract readonly currentPageDescriptor: PageDescriptorV2 | PageDescriptorV4;
    protected entitySet: string | undefined;
    protected navProperties: { navProperty: string; entitySet: string }[];
    protected existingPages: ApplicationPageData[];
    protected pageType: string | undefined;

    constructor(context: QuickActionContext) {
        super(ADD_NEW_OBJECT_PAGE_ACTION, [], 'QUICK_ACTION_ADD_NEW_SUB_PAGE', context, [
            {
                run: async (): Promise<EnablementValidatorResult> => {
                    const i18n = await getTextBundle();
                    if (this.navProperties.length === 0) {
                        return {
                            type: 'error',
                            message: i18n.getText('NO_SUB_PAGES_TO_ADD')
                        };
                    }
                    return undefined;
                }
            },
            DIALOG_ENABLEMENT_VALIDATOR
        ]);

        this.appReference = context.flexSettings.projectId ?? '';
        this.existingPages = this.getApplicationPages();
    }

    protected abstract getApplicationPages(): ApplicationPageData[];
    protected abstract isPageExists(targetEntitySet: string, metaModel: ODataMetaModelType): boolean | Promise<boolean>;
    protected abstract isCurrentObjectPage(): boolean;
    protected abstract getEntitySetNameFromPageComponent(
        component: Component | undefined,
        metaModel: ODataMetaModelType
    ): Promise<string | undefined>;
    protected abstract prepareNavigationData(metaModel: ODataMetaModelType): Promise<void>;
    protected abstract getODataMetaModel(): ODataMetaModelType | undefined;

    protected async addNavigationOptionIfAvailable(
        metaModel: ODataMetaModelType,
        targetEntitySet?: string,
        navProperty?: string
    ) {
        if (!targetEntitySet) {
            return;
        }
        const pageExists = await this.isPageExists(targetEntitySet, metaModel);
        if (!pageExists) {
            this.navProperties.push({
                entitySet: targetEntitySet,
                navProperty: navProperty ?? targetEntitySet
            });
        }
    }

    async initialize(): Promise<void> {
        if (!this.appReference) {
            throw new Error('App reference not defined');
        }
        const allControls = CONTROL_TYPES.flatMap((item) => this.context.controlIndex[item] ?? []);
        const control = allControls.find((c) => pageHasControlId(this.context.view, c.controlId));

        this.pageType = this.context.view.getViewName().split('.view.')[0];

        const metaModel = this.getODataMetaModel();
        if (!metaModel || !control) {
            return Promise.resolve();
        }

        const modifiedControl = getControlById<ObjectPageLayout>(control.controlId);
        if (!modifiedControl) {
            return Promise.resolve();
        }

        const component = Component.getOwnerComponentFor(modifiedControl);
        const entitySetName = await this.getEntitySetNameFromPageComponent(component, metaModel);
        if (!entitySetName) {
            return Promise.resolve();
        }
        this.entitySet = entitySetName;

        this.navProperties = [];
        if (!this.isCurrentObjectPage()) {
            await this.addNavigationOptionIfAvailable(metaModel, this.entitySet);
        } else {
            await this.prepareNavigationData(metaModel);
        }
        this.control = modifiedControl;

        return Promise.resolve();
    }

    async execute(): Promise<FlexCommand[]> {
        const overlay = OverlayRegistry.getOverlay(this.control!);
        await DialogFactory.createDialog(
            overlay,
            this.context.rta,
            DialogNames.ADD_SUBPAGE,
            undefined,
            {
                appReference: this.appReference,
                navProperties: this.navProperties,
                title: 'ADD_SUB_PAGE_DIALOG_TITLE',
                pageDescriptor: this.currentPageDescriptor
            },
            { actionName: this.type, telemetryEventIdentifier: this.getTelemetryIdentifier() }
        );
        return [];
    }
}

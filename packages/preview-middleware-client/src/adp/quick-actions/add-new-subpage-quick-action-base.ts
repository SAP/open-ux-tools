import Component from 'sap/ui/core/Component';
import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import ObjectPageLayout from 'sap/uxap/ObjectPageLayout';
import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';

import { QuickActionContext, SimpleQuickActionDefinition } from '../../cpe/quick-actions/quick-action-definition';
import { pageHasControlId } from '../../cpe/quick-actions/utils';
import { getControlById } from '../../utils/core';
import { getApplicationType } from '../../utils/application';
import { DialogFactory, DialogNames } from '../dialog-factory';
import { EnablementValidatorResult } from './enablement-validator';
import { getTextBundle } from '../../i18n';
import { SimpleQuickActionDefinitionBase } from './simple-quick-action-base';
import { DIALOG_ENABLEMENT_VALIDATOR } from './dialog-enablement-validator';

export const ADD_NEW_OBJECT_PAGE_ACTION = 'add-new-subpage';
const CONTROL_TYPES = ['sap.f.DynamicPage', 'sap.uxap.ObjectPageLayout'];

interface ViewDataType {
    stableId: string;
}

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
    protected readonly currentPageDescriptor: {
        entitySet: string;
        pageId: string;
        pageType: string;
        navProperties: { navProperty: string; entitySet: string }[]; // only navProperty with 1:n relationship and the entitySet
        routePattern?: string;
    } = {
        entitySet: '',
        pageId: '',
        pageType: '',
        navProperties: []
    };

    protected existingPages: ApplicationPageData[];

    constructor(context: QuickActionContext) {
        super(ADD_NEW_OBJECT_PAGE_ACTION, [], 'QUICK_ACTION_ADD_NEW_SUB_PAGE', context, [
            {
                run: async (): Promise<EnablementValidatorResult> => {
                    const i18n = await getTextBundle();
                    if (this.currentPageDescriptor.navProperties.length === 0) {
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
        this.existingPages = this.getApplicationPages();
    }

    protected abstract getApplicationPages(): ApplicationPageData[];
    protected abstract isPageExists(targetEntitySet: string, metaModel: ODataMetaModelType): boolean | Promise<boolean>;
    protected abstract isCurrentObjectPage(): boolean;
    protected abstract getEntitySetNameFromPageComponent(component: Component | undefined): string;
    protected abstract prepareNavigationData(entitySetName: string, metaModel: ODataMetaModelType): Promise<void>;
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
            this.currentPageDescriptor.navProperties.push({
                entitySet: targetEntitySet,
                navProperty: navProperty ?? targetEntitySet
            });
        }
    }

    async initialize(): Promise<void> {
        const allControls = CONTROL_TYPES.flatMap((item) => this.context.controlIndex[item] ?? []);
        const control = allControls.find((c) => pageHasControlId(this.context.view, c.controlId));

        const pageType = this.context.view.getViewName().split('.view.')[0];
        this.currentPageDescriptor.pageType = pageType;
        this.currentPageDescriptor.pageId = (this.context.view.getViewData() as ViewDataType)?.stableId
            .split('::')
            .pop() as string;

        const metaModel = this.getODataMetaModel();
        if (!metaModel || !control) {
            return Promise.resolve();
        }

        const modifiedControl = getControlById<ObjectPageLayout>(control.controlId);
        if (!modifiedControl) {
            return Promise.resolve();
        }

        const component = Component.getOwnerComponentFor(modifiedControl);
        const entitySetName = this.getEntitySetNameFromPageComponent(component);
        if (!entitySetName) {
            return Promise.resolve();
        }
        this.currentPageDescriptor.entitySet = entitySetName;

        if (!this.isCurrentObjectPage()) {
            await this.addNavigationOptionIfAvailable(metaModel, this.currentPageDescriptor.entitySet);
        } else {
            await this.prepareNavigationData(entitySetName, metaModel);
        }
        this.control = modifiedControl;

        return Promise.resolve();
    }

    async execute(): Promise<FlexCommand[]> {
        const overlay = OverlayRegistry.getOverlay(this.control!);
        const appType = getApplicationType(this.context.manifest);
        const appReference = this.context.flexSettings.projectId;

        await DialogFactory.createDialog(
            overlay,
            this.context.rta,
            DialogNames.ADD_SUBPAGE,
            undefined,
            {
                appType,
                appReference,
                title: 'ADD_SUB_PAGE_DIALOG_TITLE',
                pageDescriptor: this.currentPageDescriptor
            },
            { actionName: this.type, telemetryEventIdentifier: this.getTelemetryIdentifier() }
        );
        return [];
    }
}

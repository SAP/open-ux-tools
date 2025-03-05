import Component from 'sap/ui/core/Component';
import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import ObjectPageLayout from 'sap/uxap/ObjectPageLayout';
import ODataModel from 'sap/ui/model/odata/v2/ODataModel';
import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';
import TemplateComponent from 'sap/suite/ui/generic/template/lib/TemplateComponent';

import { QuickActionContext, SimpleQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
import { pageHasControlId } from '../../../cpe/quick-actions/utils';
import { getControlById } from '../../../utils/core';
import { EntityContainer, EntitySet, EntityType } from 'sap/ui/model/odata/ODataMetaModel';
import { ApplicationType, getApplicationType } from '../../../utils/application';
import { DialogFactory, DialogNames } from '../../dialog-factory';
import { areManifestChangesSupported } from '../fe-v2/utils';
import { getV2ApplicationPages } from '../../../utils/fe-v2';
import { getV4ApplicationPages } from '../../../utils/fe-v4';
import { EnablementValidatorResult } from '../enablement-validator';
import { getTextBundle } from '../../../i18n';
import { SimpleQuickActionDefinitionBase } from '../simple-quick-action-base';

export const ADD_NEW_OBJECT_PAGE_ACTION = 'add-new-subpage';
const CONTROL_TYPES = ['sap.f.DynamicPage', 'sap.uxap.ObjectPageLayout'];

/**
 * Quick Action for adding a custom page action.
 */
export class AddNewSubpage extends SimpleQuickActionDefinitionBase implements SimpleQuickActionDefinition {
    private currentPageDescriptor: {
        pageType: string;
        entitySet: string;
        navProperties: { navProperty: string; entitySet: string }[]; // only navProperty with 1:n relationship and the entitySet
    } = {
        entitySet: '',
        pageType: '',
        navProperties: []
    };

    private appType: ApplicationType;

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
            }
        ]);
    }

    private getApplicationPages() {
        if (this.appType === 'fe-v2') {
            return getV2ApplicationPages(this.context.manifest);
        } else if (this.appType === 'fe-v4') {
            return getV4ApplicationPages(this.context.manifest);
        }
        return [];
    }

    async initialize(): Promise<void> {
        if (!(await areManifestChangesSupported(this.context.manifest))) {
            return Promise.resolve();
        }

        this.appType = getApplicationType(this.context.manifest);

        const allControls = CONTROL_TYPES.flatMap((item) => this.context.controlIndex[item] ?? []);
        const control = allControls.find((c) => pageHasControlId(this.context.view, c.controlId));

        const pageType = this.context.view.getViewName().split('.view.')[0];
        this.currentPageDescriptor.pageType = pageType;

        const metaModel = (this.context.rta.getRootControlInstance().getModel() as ODataModel)?.getMetaModel();
        if (!metaModel || !control) {
            return Promise.resolve();
        }

        const modifiedControl = getControlById<ObjectPageLayout>(control.controlId);
        if (!modifiedControl) {
            return Promise.resolve();
        }
        this.control = modifiedControl;

        const component = Component.getOwnerComponentFor(modifiedControl) as TemplateComponent;
        const entitySetName = component.getEntitySet();
        if (!entitySetName) {
            return Promise.resolve();
        }
        this.currentPageDescriptor.entitySet = entitySetName;

        const entitySet = metaModel.getODataEntitySet(entitySetName) as EntitySet;
        const entityType = metaModel.getODataEntityType(entitySet.entityType) as EntityType;

        const existingPages = this.getApplicationPages();

        if (this.currentPageDescriptor.pageType === 'sap.suite.ui.generic.template.ObjectPage') {
            // Navigation from Object Page
            for (const navProp of entityType?.navigationProperty || []) {
                const associationEnd = metaModel.getODataAssociationEnd(entityType, navProp.name);
                if (associationEnd?.multiplicity !== '*') {
                    continue;
                }
                const entityContainer = metaModel.getODataEntityContainer() as EntityContainer;
                if (!entityContainer?.entitySet?.length) {
                    continue;
                }
                const targetEntitySet = entityContainer.entitySet.find(
                    (item) => item.entityType === associationEnd.type
                );
                const pageExists = existingPages.some((page) => page.entitySet === targetEntitySet?.name);
                if (targetEntitySet && !pageExists) {
                    this.currentPageDescriptor.navProperties.push({
                        entitySet: targetEntitySet.name,
                        navProperty: navProp.name
                    });
                }
            }
        } else {
            // navigation from LR or ALP (only OP based on current entitySet is possible)
            const pageExists = existingPages.some((page) => page.entitySet === this.currentPageDescriptor.entitySet);
            if (!pageExists) {
                this.currentPageDescriptor.navProperties.push({
                    entitySet: this.currentPageDescriptor.entitySet,
                    navProperty: this.currentPageDescriptor.entitySet
                });
            }
        }

        return Promise.resolve();
    }

    async execute(): Promise<FlexCommand[]> {
        const overlay = OverlayRegistry.getOverlay(this.control!) || [];
        const appReference = this.context.flexSettings.projectId ?? '';
        await DialogFactory.createDialog(overlay, this.context.rta, DialogNames.ADD_SUBPAGE, undefined, {
            appType: this.appType,
            appReference,
            title: 'ADD_SUB_PAGE_DIALOG_TITLE',
            pageDescriptor: this.currentPageDescriptor
        });
        return [];
    }
}

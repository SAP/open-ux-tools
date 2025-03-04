import FlexCommand from 'sap/ui/rta/command/FlexCommand';

import { QuickActionContext, SimpleQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
import { DIALOG_ENABLEMENT_VALIDATOR } from '../dialog-enablement-validator';
import { pageHasControlId } from '../../../cpe/quick-actions/utils';
import { getControlById } from '../../../utils/core';
import ObjectPageLayout from 'sap/uxap/ObjectPageLayout';
import Component from 'sap/ui/core/Component';
import { EntityContainer, EntitySet, EntityType } from 'sap/ui/model/odata/ODataMetaModel';
import ODataModel from 'sap/ui/model/odata/v2/ODataModel';
import { QuickActionDefinitionBase } from '../quick-action-base';
import {
    NestedQuickActionChild,
    SIMPLE_QUICK_ACTION_KIND,
    SimpleQuickAction
} from '@sap-ux-private/control-property-editor-common';
import { getApplicationPages, getApplicationType } from '../../../utils/application';
import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';
import { DialogFactory, DialogNames } from '../../dialog-factory';
import TemplateComponent from 'sap/suite/ui/generic/template/lib/TemplateComponent';

export const ADD_NEW_OBJECT_PAGE_ACTION = 'add-new-object-page';
// const CONTROL_TYPES = [
//     { control: 'sap.f.DynamicPage', pageType: 'sap.suite.ui.generic.template.ListReport' },
//     { control: 'sap.uxap.ObjectPageLayout', pageType: 'sap.suite.ui.generic.template.ObjectPage' },
//     { control: 'aaaa' , pageType: 'sap.suite.ui.generic.template.AnalyticalListPage'}
// ];
const CONTROL_TYPES = ['sap.f.DynamicPage', 'sap.uxap.ObjectPageLayout'];

/**
 * Quick Action for adding a custom page action.
 */
export class AddNewSubpage
    extends QuickActionDefinitionBase<typeof SIMPLE_QUICK_ACTION_KIND>
    implements SimpleQuickActionDefinition
{
    private currentPageDescriptor: {
        pageType: string;
        entitySet: string;
        navProperties: { navProperty: string; entitySet: string }[]; // only navProperty with 1:n relationship and the entitySet
    } = {
        entitySet: '',
        pageType: '',
        navProperties: []
    };

    public isApplicable = true;
    public get id(): string {
        return `${this.context.key}-${this.type}`;
    }
    public children: NestedQuickActionChild[] = [];
    constructor(context: QuickActionContext) {
        super(ADD_NEW_OBJECT_PAGE_ACTION, SIMPLE_QUICK_ACTION_KIND, 'QUICK_ACTION_ADD_NEW_SUB_PAGE', context, [
            DIALOG_ENABLEMENT_VALIDATOR
        ]);
    }

    private currentPageControl: ObjectPageLayout;

    async initialize(): Promise<void> {
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
        this.currentPageControl = modifiedControl;

        const component = Component.getOwnerComponentFor(modifiedControl) as TemplateComponent;
        const entitySetName = component.getEntitySet();
        if (!entitySetName) {
            return Promise.resolve();
        }

        this.currentPageDescriptor.entitySet = entitySetName;

        const entitySet = metaModel.getODataEntitySet(entitySetName) as EntitySet;
        const entityType = metaModel.getODataEntityType(entitySet.entityType) as EntityType;

        const existingPages = getApplicationPages(this.context.manifest);

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
        const overlay = OverlayRegistry.getOverlay(this.currentPageControl) || [];
        const appType = getApplicationType(this.context.manifest);
        const appReference = this.context.flexSettings.projectId;
        await DialogFactory.createDialog(overlay, this.context.rta, DialogNames.ADD_SUBPAGE, undefined, {
            title: 'ADD_SUB_PAGE_DIALOG_TITLE',
            currentPageEntitySet: this.currentPageDescriptor.entitySet,
            navigationOptions: this.currentPageDescriptor.navProperties,
            appType,
            appReference,
            pageType: this.currentPageDescriptor.pageType
        });
        return [];
    }

    getActionObject(): SimpleQuickAction {
        const enabled = this.currentPageDescriptor.navProperties.length > 0;
        return {
            kind: SIMPLE_QUICK_ACTION_KIND,
            id: this.id,
            enabled,
            title: this.context.resourceBundle.getText(this.textKey),
            tooltip: enabled ? undefined : this.context.resourceBundle.getText('NO_SUB_PAGES_TO_ADD')
        };
    }
}

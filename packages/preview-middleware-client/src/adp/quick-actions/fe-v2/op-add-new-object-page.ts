import FlexCommand from 'sap/ui/rta/command/FlexCommand';

import { NestedQuickActionDefinition, QuickActionContext } from '../../../cpe/quick-actions/quick-action-definition';
import { DIALOG_ENABLEMENT_VALIDATOR } from '../dialog-enablement-validator';
import { pageHasControlId } from '../../../cpe/quick-actions/utils';
import { getControlById } from '../../../utils/core';
import ObjectPageLayout from 'sap/uxap/ObjectPageLayout';
import Component from 'sap/ui/core/Component';
import { EntityContainer, EntitySet, EntityType } from 'sap/ui/model/odata/ODataMetaModel';
import ODataModel from 'sap/ui/model/odata/v2/ODataModel';
import { QuickActionDefinitionBase } from '../quick-action-base';
import {
    NESTED_QUICK_ACTION_KIND,
    NestedQuickAction,
    NestedQuickActionChild
} from '@sap-ux-private/control-property-editor-common';

export const ADD_NEW_OBJECT_PAGE_ACTION = 'add-new-object-page';

/**
 * Quick Action for adding a custom page action.
 */
export class AddNewObjectPage
    extends QuickActionDefinitionBase<typeof NESTED_QUICK_ACTION_KIND>
    implements NestedQuickActionDefinition
{
    private objectPageMap: {
        [objectPageLayoutId: string]: {
            entitySet: string;
            navProperties: { [navProperty: string]: string }; // only navProperty with 1:n relationship and the entitySet
        };
    };
    public isApplicable = true;
    public get id(): string {
        return `${this.context.key}-${this.type}`;
    }
    public children: NestedQuickActionChild[] = [];
    constructor(context: QuickActionContext) {
        super(ADD_NEW_OBJECT_PAGE_ACTION, NESTED_QUICK_ACTION_KIND, '', context, [DIALOG_ENABLEMENT_VALIDATOR]);
        this.objectPageMap = {};
    }

    protected get textKey() {
        let result = 'V4_QUICK_ACTION_OP_ADD_NEW_OBJECT_PAGE';
        // const dataSourceIds = Object.keys(this.annotationDataSourceData.annotationDataSourceMap);
        // if (dataSourceIds.length === 1) {
        //     const details = this.annotationDataSourceData.annotationDataSourceMap[dataSourceIds[0]];
        //     if (details.annotationDetails.annotationExistsInWS) {
        //         result = 'QUICK_ACTION_SHOW_ANNOTATION_FILE';
        //     }
        // }
        return result;
    }

    async initialize(): Promise<void> {
        const controls = [...(this.context.controlIndex['sap.uxap.ObjectPageLayout'] ?? [])];
        const metaModel = (this.context.rta.getRootControlInstance().getModel() as ODataModel)?.getMetaModel();
        for (const control of controls) {
            const isActionApplicable = pageHasControlId(this.context.view, control.controlId);
            const modifiedControl = getControlById<ObjectPageLayout>(control.controlId);
            if (isActionApplicable && modifiedControl && metaModel) {
                // this.control = modifiedControl;
                const component = Component.getOwnerComponentFor(modifiedControl);
                const entitySet = (component as any)?.getEntitySet() as string;
                if (entitySet) {
                    if (!this.objectPageMap[control.controlId]) {
                        this.objectPageMap[control.controlId] = {
                            entitySet: entitySet,
                            navProperties: {}
                        };
                    }
                    const entitySetObj = metaModel.getODataEntitySet(entitySet) as EntitySet;
                    const entityType = metaModel.getODataEntityType(entitySetObj.entityType) as EntityType;
                    for (const navProp of entityType?.navigationProperty || []) {
                        const associationEnd = metaModel.getODataAssociationEnd(entityType, navProp.name);
                        if (associationEnd?.multiplicity === '*') {
                            const entityContainer = metaModel.getODataEntityContainer() as EntityContainer;
                            if (entityContainer?.entitySet?.length) {
                                const entitySetName = entityContainer.entitySet.find(
                                    (item) => item.entityType === associationEnd.type
                                );
                                if (entitySetName) {
                                    this.objectPageMap[control.controlId].navProperties[navProp.name] =
                                        entitySetName.name;
                                }
                            }
                            this.children.push({
                                enabled: true,
                                label: `Add Object Page for '${navProp.name}'`,
                                // annotationExistsInWS
                                //     ? this.context.resourceBundle.getText('OBJECT_PAGE_EXISTS', [key])
                                //     : this.context.resourceBundle.getText('ADD', [key]),
                                children: []
                            });
                        }
                    }
                }
            }
        }
    }

    async execute(): Promise<FlexCommand[]> {
        // if (this.control) {
        //     const overlay = OverlayRegistry.getOverlay(this.control) || [];
        //     await DialogFactory.createDialog(overlay, this.context.rta, DialogNames.ADD_FRAGMENT, undefined, {
        //         aggregation: 'actions',
        //         title: 'QUICK_ACTION_ADD_CUSTOM_PAGE_ACTION'
        //     });
        // }
        return [];
    }

    getActionObject(): NestedQuickAction {
        return {
            kind: NESTED_QUICK_ACTION_KIND,
            id: this.id,
            enabled: true,
            title: this.context.resourceBundle.getText(this.textKey),
            children: this.children
        };
    }
}

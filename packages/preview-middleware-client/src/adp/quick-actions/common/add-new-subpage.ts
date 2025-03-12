import Component from 'sap/ui/core/Component';
import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import ObjectPageLayout from 'sap/uxap/ObjectPageLayout';
import ODataModelV2 from 'sap/ui/model/odata/v2/ODataModel';
import ODataModelV4 from 'sap/ui/model/odata/v4/ODataModel';
import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';
import TemplateComponent from 'sap/suite/ui/generic/template/lib/TemplateComponent';
import ODataMetaModelV2, { EntityContainer, EntitySet, EntityType } from 'sap/ui/model/odata/ODataMetaModel';
import ODataMetaModelV4 from 'sap/ui/model/odata/v4/ODataMetaModel';
import FEObjectPageComponent from 'sap/fe/templates/ObjectPage/Component';
import FEListReportComponent from 'sap/fe/templates/ListReport/Component';

import { QuickActionContext, SimpleQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
import { pageHasControlId } from '../../../cpe/quick-actions/utils';
import { getControlById, isA } from '../../../utils/core';
import { ApplicationType, getApplicationType } from '../../../utils/application';
import { DialogFactory, DialogNames } from '../../dialog-factory';
import { areManifestChangesSupported } from '../fe-v2/utils';
import { getV2ApplicationPages } from '../../../utils/fe-v2';
import { getV4ApplicationPages } from '../../../utils/fe-v4';
import { EnablementValidatorResult } from '../enablement-validator';
import { getTextBundle } from '../../../i18n';
import { SimpleQuickActionDefinitionBase } from '../simple-quick-action-base';

export const ADD_NEW_OBJECT_PAGE_ACTION = 'add-new-subpage';
const OBJECT_PAGE_COMPONENT_NAME_V2 = 'sap.suite.ui.generic.template.ObjectPage';
const OBJECT_PAGE_COMPONENT_NAME_V4 = 'sap.fe.templates.ObjectPage.ObjectPage';
const CONTROL_TYPES = ['sap.f.DynamicPage', 'sap.uxap.ObjectPageLayout'];

interface ApplicationPageData {
    id: string;
    entitySet: string | undefined;
}

/**
 * Quick Action for adding a custom page action.
 */
export class AddNewSubpage extends SimpleQuickActionDefinitionBase implements SimpleQuickActionDefinition {
    private readonly currentPageDescriptor: {
        pageType: string;
        entitySet: string;
        navProperties: { navProperty: string; entitySet: string }[]; // only navProperty with 1:n relationship and the entitySet
    } = {
        entitySet: '',
        pageType: '',
        navProperties: []
    };

    private appType: ApplicationType;
    private existingPages: ApplicationPageData[];

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
        this.appType = getApplicationType(context.manifest);
        if (this.appType === 'fe-v2') {
            this.existingPages = getV2ApplicationPages(context.manifest);
        } else {
            this.existingPages = []; //getV4ApplicationPages(context.manifest);
        }
    }

    private addNavigationOptionIfAvailable(targetEntitySet?: string, navProperty?: string) {
        if (!targetEntitySet) {
            return;
        }
        const pageExists = this.existingPages.some((page) => page.entitySet === targetEntitySet);
        if (!pageExists) {
            this.currentPageDescriptor.navProperties.push({
                entitySet: targetEntitySet,
                navProperty: navProperty ?? targetEntitySet
            });
        }
    }

    private isCurrentObjectPage(): boolean {
        return [OBJECT_PAGE_COMPONENT_NAME_V2, OBJECT_PAGE_COMPONENT_NAME_V4].includes(
            this.currentPageDescriptor.pageType
        );
    }

    private prepareNavigationDataV2(entitySetName: string, metaModel: ODataMetaModelV2): void {
        if (!this.isCurrentObjectPage()) {
            // navigation from LR or ALP (only OP based on current entitySet is possible)
            this.addNavigationOptionIfAvailable(this.currentPageDescriptor.entitySet);
            return;
        }
        // Navigation from Object Page
        const entitySet = metaModel.getODataEntitySet(entitySetName) as EntitySet;
        const entityType = metaModel.getODataEntityType(entitySet.entityType) as EntityType;

        for (const navProp of entityType?.navigationProperty || []) {
            const associationEnd = metaModel.getODataAssociationEnd(entityType, navProp.name);
            if (associationEnd?.multiplicity !== '*') {
                continue;
            }
            const entityContainer = metaModel.getODataEntityContainer() as EntityContainer;
            if (!entityContainer?.entitySet?.length) {
                continue;
            }
            const targetEntitySet = entityContainer.entitySet.find((item) => item.entityType === associationEnd.type);
            this.addNavigationOptionIfAvailable(targetEntitySet?.name, navProp.name);
        }
    }

    private async prepareNavigationDataV4(entitySetName: string, metaModel: ODataMetaModelV4) {
        if (!this.isCurrentObjectPage()) {
            this.addNavigationOptionIfAvailable(this.currentPageDescriptor.entitySet);
            return;
        }
        const entitySet = (await metaModel.requestObject(`/${entitySetName}`)) as {
            $Type: string;
            $NavigationPropertyBinding: { [key: string]: string };
        }; // NO SONAR;
        var entityTypePath = entitySet.$Type;
        const entitySetNavigationKeys = Object.keys(entitySet.$NavigationPropertyBinding);

        for (const navigationProperty of entitySetNavigationKeys) {
            const associationEnd = (await metaModel.requestObject(`/${entityTypePath}/${navigationProperty}`)) as {
                $Type: string;
                $isCollection: boolean;
                $kind: 'NavigationProperty';
            };
            if (associationEnd?.$isCollection) {
                const targetEntitySet = entitySet.$NavigationPropertyBinding[navigationProperty];
                this.addNavigationOptionIfAvailable(targetEntitySet, navigationProperty);
            }
        }
    }

    async initialize(): Promise<void> {
        // if (FeatureService.isFeatureEnabled('cpe.beta.quick-actions') === false) {
        //     return Promise.resolve();
        // }

        if (!(await areManifestChangesSupported(this.context.manifest))) {
            return Promise.resolve();
        }

        const allControls = CONTROL_TYPES.flatMap((item) => this.context.controlIndex[item] ?? []);
        const control = allControls.find((c) => pageHasControlId(this.context.view, c.controlId));

        const pageType = this.context.view.getViewName().split('.view.')[0];
        this.currentPageDescriptor.pageType = pageType;

        const metaModel = (
            this.context.rta.getRootControlInstance().getModel() as ODataModelV2 | ODataModelV4
        )?.getMetaModel();
        if (!metaModel || !control) {
            return Promise.resolve();
        }

        const modifiedControl = getControlById<ObjectPageLayout>(control.controlId);
        if (!modifiedControl) {
            return Promise.resolve();
        }

        const component = Component.getOwnerComponentFor(modifiedControl);
        if (
            !isA<TemplateComponent>('sap.suite.ui.generic.template.lib.TemplateComponent', component) &&
            !isA<FEObjectPageComponent>('sap.fe.templates.ListReport.Component', component) &&
            !isA<FEListReportComponent>('sap.fe.templates.ObjectPage.Component', component)
        ) {
            return Promise.reject(new Error('Unexpected type of page owner component'));
        }

        const entitySetName = component.getEntitySet();
        if (!entitySetName) {
            return Promise.resolve();
        }
        this.currentPageDescriptor.entitySet = entitySetName;

        if (this.appType === 'fe-v2') {
            this.prepareNavigationDataV2(entitySetName, metaModel as ODataMetaModelV2);
        } else {
            await this.prepareNavigationDataV4(entitySetName, metaModel as ODataMetaModelV4);
        }
        this.control = modifiedControl;

        return Promise.resolve();
    }

    async execute(): Promise<FlexCommand[]> {
        const overlay = OverlayRegistry.getOverlay(this.control!);
        const appReference = this.context.flexSettings.projectId;
        await DialogFactory.createDialog(overlay, this.context.rta, DialogNames.ADD_SUBPAGE, undefined, {
            appType: this.appType,
            appReference,
            title: 'ADD_SUB_PAGE_DIALOG_TITLE',
            pageDescriptor: this.currentPageDescriptor
        });
        return [];
    }
}

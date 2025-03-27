import ODataModelV2 from 'sap/ui/model/odata/v2/ODataModel';
import ODataMetaModelV2, { EntityContainer, EntitySet, EntityType } from 'sap/ui/model/odata/ODataMetaModel';
import TemplateComponent from 'sap/suite/ui/generic/template/lib/TemplateComponent';

import { getV2ApplicationPages } from '../../../utils/fe-v2';
import { AddNewSubpageBase, ApplicationPageData } from '../add-new-subpage-quick-action-base';
import Component from 'sap/ui/core/Component';
import { isA } from '../../../utils/core';
import { areManifestChangesSupported } from './utils';

const OBJECT_PAGE_COMPONENT_NAME_V2 = 'sap.suite.ui.generic.template.ObjectPage';

/**
 * Quick Action for adding a custom page action.
 */
export class AddNewSubpage extends AddNewSubpageBase<ODataMetaModelV2> {
    protected getApplicationPages(): ApplicationPageData[] {
        return getV2ApplicationPages(this.context.manifest);
    }

    protected isPageExists(targetEntitySet: string): boolean {
        return this.existingPages.some((page) => page.entitySet === targetEntitySet);
    }

    protected isCurrentObjectPage(): boolean {
        return this.currentPageDescriptor.pageType === OBJECT_PAGE_COMPONENT_NAME_V2;
    }

    protected getODataMetaModel(): ODataMetaModelV2 | undefined {
        return (this.context.rta.getRootControlInstance().getModel() as ODataModelV2)?.getMetaModel();
    }

    protected getEntitySetNameFromPageComponent(component: Component | undefined): string {
        if (!isA<TemplateComponent>('sap.suite.ui.generic.template.lib.TemplateComponent', component)) {
            throw new Error('Unexpected type of page owner component');
        }

        return component.getEntitySet();
    }

    protected async prepareNavigationData(entitySetName: string, metaModel: ODataMetaModelV2): Promise<void> {
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
            await this.addNavigationOptionIfAvailable(metaModel, targetEntitySet?.name, navProp.name);
        }
        return Promise.resolve();
    }

    async initialize(): Promise<void> {
        if (!(await areManifestChangesSupported(this.context.manifest))) {
            return Promise.resolve();
        }

        return await super.initialize();
    }
}

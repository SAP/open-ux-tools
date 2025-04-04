import ODataModelV4 from 'sap/ui/model/odata/v4/ODataModel';
import ODataMetaModelV4 from 'sap/ui/model/odata/v4/ODataMetaModel';
import Component from 'sap/ui/core/Component';
import AppComponent from 'sap/fe/core/AppComponent';

import { getV4AppComponent, getV4ApplicationPages } from '../../../utils/fe-v4';
import { AddNewSubpageBase, ApplicationPageData } from '../add-new-subpage-quick-action-base';
import { isA } from '../../../utils/core';
import FEObjectPageComponent from 'sap/fe/templates/ObjectPage/Component';
import FEListReportComponent from 'sap/fe/templates/ListReport/Component';
import { getUi5Version, isLowerThanMinimalUi5Version } from '../../../utils/version';
import { PageDescriptorV4 } from '../../controllers/AddSubpage.controller';

export const OBJECT_PAGE_COMPONENT_NAME_V4 = 'sap.fe.templates.ObjectPage.ObjectPage';

interface ViewDataType {
    stableId: string;
}

/**
 * Quick Action for adding a custom page action.
 */
export class AddNewSubpage extends AddNewSubpageBase<ODataMetaModelV4> {
    protected pageId: string | undefined;
    protected routePattern: string | undefined;
    protected appComponent: AppComponent | undefined;

    protected get currentPageDescriptor(): PageDescriptorV4 {
        if (!this.pageId) {
            throw new Error('pageId is not defined');
        }
        if (!this.routePattern) {
            throw new Error('routePattern is not defined');
        }
        if (!this.appComponent) {
            throw new Error('appComponent is not defined');
        }
        return {
            appType: 'fe-v4',
            appComponent: this.appComponent,
            pageId: this.pageId,
            routePattern: this.routePattern
        };
    }

    protected getApplicationPages(): ApplicationPageData[] {
        return getV4ApplicationPages(this.context.manifest);
    }

    private async resolveContextPathTargetName(
        contextPath: string,
        metaModel: ODataMetaModelV4
    ): Promise<string | undefined> {
        let result: string | undefined;
        const segments = contextPath.split('/').filter((s) => !!s);
        if (segments.length === 1) {
            // one segment - assumed it is the direct name of entitySet
            result = segments[0];
        } else {
            // resolve segment by segment
            let targetObject = (await metaModel.requestObject(`/${segments[0]}`)) as
                | {
                      $Type: string;
                      $NavigationPropertyBinding: { [key: string]: string };
                  }
                | undefined; // NO SONAR;

            let idx = 1;
            let targetSetName = '';
            while (targetObject && idx < segments.length) {
                const navProp = segments[idx];
                targetSetName = targetObject.$NavigationPropertyBinding[navProp];
                if (!targetSetName) {
                    targetObject = undefined;
                } else {
                    targetObject = (await metaModel.requestObject(`/${targetSetName}`)) as
                        | {
                              $Type: string;
                              $NavigationPropertyBinding: { [key: string]: string };
                          }
                        | undefined; // NO SONAR;
                    idx++;
                }
            }
            if (targetObject) {
                result = targetSetName;
            }
        }
        return result;
    }

    protected async isPageExists(targetEntitySet: string, metaModel: ODataMetaModelV4): Promise<boolean> {
        let pageFound = false;
        let entitySetName: string | undefined;
        for (const page of this.existingPages) {
            if (page.contextPath) {
                // resolve contextPath to target entitySet
                entitySetName = await this.resolveContextPathTargetName(page.contextPath, metaModel);
            } else {
                entitySetName = page.entitySet;
            }

            if (entitySetName === targetEntitySet) {
                pageFound = true;
                break;
            }
        }

        return pageFound;
    }

    protected isCurrentObjectPage(): boolean {
        return this.pageType === OBJECT_PAGE_COMPONENT_NAME_V4;
    }

    protected getODataMetaModel(): ODataMetaModelV4 | undefined {
        return (this.context.rta.getRootControlInstance().getModel() as ODataModelV4)?.getMetaModel();
    }

    protected async getEntitySetNameFromPageComponent(
        component: Component | undefined,
        metaModel: ODataMetaModelV4
    ): Promise<string | undefined> {
        if (
            !isA<FEObjectPageComponent>('sap.fe.templates.ListReport.Component', component) &&
            !isA<FEListReportComponent>('sap.fe.templates.ObjectPage.Component', component)
        ) {
            throw new Error('Unexpected type of page owner component');
        }
        let entitySet: string | undefined = component.getEntitySet();
        let contextPath = component.getContextPath();
        if (contextPath) {
            entitySet = await this.resolveContextPathTargetName(contextPath, metaModel);
        }
        return entitySet;
    }

    protected async prepareNavigationData(metaModel: ODataMetaModelV4) {
        const entitySet = (await metaModel.requestObject(`/${this.entitySet}`)) as {
            $Type: string;
            $NavigationPropertyBinding: { [key: string]: string };
        }; // NO SONAR;
        if (!entitySet) {
            return;
        }
        const entityTypePath = entitySet.$Type;
        const entitySetNavigationKeys = Object.keys(entitySet.$NavigationPropertyBinding);

        for (const navigationProperty of entitySetNavigationKeys) {
            const associationEnd = (await metaModel.requestObject(`/${entityTypePath}/${navigationProperty}`)) as {
                $Type: string;
                $isCollection: boolean;
                $kind: 'NavigationProperty';
            };
            if (associationEnd?.$isCollection) {
                const targetEntitySet = entitySet.$NavigationPropertyBinding[navigationProperty];
                await this.addNavigationOptionIfAvailable(metaModel, targetEntitySet, navigationProperty);
            }
        }
    }

    async initialize(): Promise<void> {
        const version = await getUi5Version();
        if (isLowerThanMinimalUi5Version(version, { major: 1, minor: 135 })) {
            return;
        }
        await super.initialize();

        this.appComponent = getV4AppComponent(this.context.view);

        this.pageId = (this.context.view.getViewData() as ViewDataType)?.stableId.split('::').pop() as string;
        // remember current page route pattern (used in dialog controller for new page change)
        const currentPageRoute = (this.context.manifest['sap.ui5'].routing?.routes ?? []).find(
            (r) => r.name === this.pageId
        );
        if (!currentPageRoute) {
            throw new Error('Current page navigation route not found in manifest');
        }
        this.routePattern = currentPageRoute.pattern;
    }
}

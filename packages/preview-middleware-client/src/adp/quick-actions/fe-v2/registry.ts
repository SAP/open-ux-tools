import XMLView from 'sap/ui/core/mvc/XMLView';
import Control from 'sap/ui/core/Control';
import ComponentContainer from 'sap/ui/core/ComponentContainer';

import type {
    QuickActionActivationContext,
    QuickActionDefinitionGroup
} from '../../../cpe/quick-actions/quick-action-definition';
import { QuickActionDefinitionRegistry } from '../../../cpe/quick-actions/registry';

import { AddControllerToPageQuickAction } from '../common/add-controller-to-page';

import { ToggleClearFilterBarQuickAction } from './lr-toggle-clear-filter-bar';
import { ChangeTableColumnsQuickAction } from './change-table-columns';
import { AddHeaderFieldQuickAction } from '../common/op-add-header-field';
import { AddCustomSectionQuickAction } from '../common/op-add-custom-section';
import { AddTableActionQuickAction } from '../fe-v2/create-table-action';
import { AddTableCustomColumnQuickAction } from './create-table-custom-column';
import { AddPageActionQuickAction } from '../common/create-page-action';
import { EnableTableFilteringQuickAction } from './lr-enable-table-filtering';
import { ToggleSemanticDateRangeFilterBar } from './lr-enable-semantic-date-range-filter-bar';
import { EnableTableEmptyRowModeQuickAction } from './op-enable-empty-row-mode';
import { AddNewAnnotationFile } from '../common/add-new-annotation-file';
import { EnableObjectPageVariantManagementQuickAction } from './op-enable-variant-management';
import { EnableListReportVariantManagementQuickAction } from './lr-enable-variant-management';
type PageName = 'listReport' | 'objectPage' | 'analyticalListPage';

const OBJECT_PAGE_TYPE = 'sap.suite.ui.generic.template.ObjectPage.view.Details';
const LIST_REPORT_TYPE = 'sap.suite.ui.generic.template.ListReport.view.ListReport';
const ANALYTICAL_LIST_PAGE_TYPE = 'sap.suite.ui.generic.template.AnalyticalListPage.view.AnalyticalListPage';
/**
 * Quick Action provider for SAP Fiori Elements V2 applications.
 */
export default class FEV2QuickActionRegistry extends QuickActionDefinitionRegistry<PageName> {
    PAGE_NAME_MAP: Record<string, PageName> = {
        [LIST_REPORT_TYPE]: 'listReport',
        [OBJECT_PAGE_TYPE]: 'objectPage',
        [ANALYTICAL_LIST_PAGE_TYPE]: 'analyticalListPage'
    };
    getDefinitions(context: QuickActionActivationContext): QuickActionDefinitionGroup[] {
        const activePages = this.getActivePageContent(context.controlIndex);

        const definitionGroups: QuickActionDefinitionGroup[] = [];
        for (let index = 0; index < activePages.length; index++) {
            const { name, view } = activePages[index];
            if (name === 'listReport') {
                definitionGroups.push({
                    title: 'LIST REPORT',
                    definitions: [
                        AddControllerToPageQuickAction,
                        AddPageActionQuickAction,
                        ToggleClearFilterBarQuickAction,
                        ToggleSemanticDateRangeFilterBar,
                        EnableListReportVariantManagementQuickAction,
                        ChangeTableColumnsQuickAction,
                        AddTableActionQuickAction,
                        AddTableCustomColumnQuickAction,
                        EnableTableFilteringQuickAction,
                        AddNewAnnotationFile
                    ],
                    view,
                    key: name + index
                });
            } else if (name === 'objectPage') {
                definitionGroups.push({
                    title: 'OBJECT PAGE',
                    definitions: [
                        AddControllerToPageQuickAction,
                        AddPageActionQuickAction,
                        AddHeaderFieldQuickAction,
                        AddCustomSectionQuickAction,
                        EnableObjectPageVariantManagementQuickAction,
                        ChangeTableColumnsQuickAction,
                        AddTableActionQuickAction,
                        AddTableCustomColumnQuickAction,
                        EnableTableEmptyRowModeQuickAction,
                        AddNewAnnotationFile
                    ],
                    view,
                    key: name + index
                });
            } else if (name === 'analyticalListPage') {
                definitionGroups.push({
                    title: 'ANALYTICAL LIST PAGE',
                    definitions: [
                        AddControllerToPageQuickAction,
                        AddPageActionQuickAction,
                        ToggleClearFilterBarQuickAction,
                        ToggleSemanticDateRangeFilterBar,
                        EnableListReportVariantManagementQuickAction,
                        ChangeTableColumnsQuickAction,
                        AddTableActionQuickAction,
                        AddTableCustomColumnQuickAction,
                        EnableTableFilteringQuickAction,
                        AddNewAnnotationFile
                    ],
                    view,
                    key: name + index
                });
            }
        }
        return definitionGroups;
    }

    protected getComponentContainerFromPage(page: Control): ComponentContainer | undefined {
        // in ui5 version 1.71 there is no XMLView wrapper around ComponentContainer
        const componentContainer = page instanceof XMLView ? page.getContent()[0] : page;
        if (componentContainer instanceof ComponentContainer) {
            return componentContainer;
        }
        return undefined;
    }
}

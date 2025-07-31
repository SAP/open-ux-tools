import type {
    QuickActionActivationContext,
    QuickActionDefinitionGroup
} from '../../../cpe/quick-actions/quick-action-definition';
import { QuickActionDefinitionRegistry } from '../../../cpe/quick-actions/registry';

import { AddControllerToPageQuickAction } from '../common/add-controller-to-page';
import { ToggleClearFilterBarQuickAction } from '../fe-v4/lr-toggle-clear-filter-bar';
import { ToggleSemanticDateRangeFilterBar } from '../fe-v4/lr-enable-semantic-date-range-filter-bar';
import { ChangeTableColumnsQuickAction } from '../fe-v4/change-table-columns';
import { AddHeaderFieldQuickAction } from '../common/op-add-header-field';
import { AddCustomSectionQuickAction } from '../common/op-add-custom-section';
import { AddTableCustomColumnQuickAction } from '../fe-v4/create-table-custom-column';
import { AddPageActionQuickAction } from '../common/create-page-action';
import { AddTableActionQuickAction } from '../fe-v4/create-table-action';
import { AddNewAnnotationFile } from '../common/add-new-annotation-file';
import { ChangeTableActionsQuickAction } from '../fe-v4/change-table-actions';
import { ChangeTableActionsQuickAction as ChangeTableActionsQuickActionV2 } from '../fe-v2/change-table-actions';
import { ChangeTableColumnsQuickAction as ChangeTableColumnsQuickActionV2 } from '../fe-v2/change-table-columns';
import { AddTableActionQuickAction as AddTableActionQuickActionV2 } from '../fe-v2/create-table-action';
import { AddTableCustomColumnQuickAction as AddTableCustomColumnQuickActionV2 } from '../fe-v2/create-table-custom-column';
import { ToggleSemanticDateRangeFilterBar as ToggleSemanticDateRangeFilterBarV2 } from '../fe-v2/lr-enable-semantic-date-range-filter-bar';
import { EnableListReportVariantManagementQuickAction as EnableListReportVariantManagementQuickActionV2 } from '../fe-v2/lr-enable-variant-management';
import { ToggleClearFilterBarQuickAction as ToggleClearFilterBarQuickActionV2 } from '../fe-v2/lr-toggle-clear-filter-bar';

type PageName = 'listReport' | 'objectPage';

const LIST_REPORT_TYPE = 'sap.fe.templates.ListReport.ListReport';
const OBJECT_PAGE_TYPE = 'sap.fe.templates.ObjectPage.ObjectPage';

/**
 * Quick Action provider for SAP Fiori Elements V4 applications.
 */
export default class FSQuickActionRegistry extends QuickActionDefinitionRegistry<PageName> {
    PAGE_NAME_MAP: Record<string, PageName> = {
        [LIST_REPORT_TYPE]: 'listReport',
        [OBJECT_PAGE_TYPE]: 'objectPage'
    };

    getDefinitions(context: QuickActionActivationContext): QuickActionDefinitionGroup[] {
        const activePages = this.getActivePageContent(context.controlIndex);
        const definitionGroups: QuickActionDefinitionGroup[] = [];
        for (let index = 0; index < activePages.length; index++) {
            const { name, view } = activePages[index];
            definitionGroups.push({
                title: 'LIST REPORT', // ToDO: find view name from routing targets in manifest json
                definitions: [
                    AddControllerToPageQuickAction,
                    AddPageActionQuickAction,
                    AddHeaderFieldQuickAction,
                    AddCustomSectionQuickAction,
                    //ToggleClearFilterBarQuickAction, // TODO: for v4 controls see how to toggle clear filter bar 
                    // ToggleSemanticDateRangeFilterBar, // TODO: for v4 controls see how to toggle semantic date range
                    ChangeTableActionsQuickAction,
                    ChangeTableColumnsQuickAction,
                    AddTableActionQuickAction,
                    AddTableCustomColumnQuickAction,
                    ToggleClearFilterBarQuickActionV2,
                    // ToggleSemanticDateRangeFilterBarV2,  // TODO: for v2 controls see how to toggle semantic date range
                    ChangeTableActionsQuickActionV2,
                    ChangeTableColumnsQuickActionV2,
                    AddTableActionQuickActionV2,
                    AddTableCustomColumnQuickActionV2,
                    AddNewAnnotationFile,
                ],
                view,
                key: name + index
            });
        }
        return definitionGroups;
    }
}

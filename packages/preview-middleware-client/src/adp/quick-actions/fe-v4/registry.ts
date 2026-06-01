import type {
    QuickActionActivationContext,
    QuickActionDefinitionGroup
} from '../../../cpe/quick-actions/quick-action-definition.js';
import { QuickActionDefinitionRegistry } from '../../../cpe/quick-actions/registry.js';

import { AddControllerToPageQuickAction } from '../common/add-controller-to-page.js';
import { ToggleClearFilterBarQuickAction } from './lr-toggle-clear-filter-bar.js';
import { ChangeTableColumnsQuickAction } from './change-table-columns.js';
import { AddHeaderFieldQuickAction } from '../common/op-add-header-field.js';
import { AddCustomSectionQuickAction } from './op-add-custom-section.js';
import { AddPageActionQuickAction } from './create-page-action.js';
import { EnableTableFilteringQuickAction } from './lr-enable-table-filtering.js';
import { ToggleSemanticDateRangeFilterBar } from './lr-enable-semantic-date-range-filter-bar.js';
import { EnableTableEmptyRowModeQuickAction } from './op-enable-empty-row-mode.js';
import { AddNewAnnotationFile } from '../common/add-new-annotation-file.js';
import { EnableVariantManagementQuickAction } from './enable-variant-management.js';
import { AddNewSubpage } from '../fe-v4/add-new-subpage.js';
import { ChangeTableActionsQuickAction } from '../fe-v4/change-table-actions.js';
import { AddTableActionQuickAction } from './create-table-action-config-change.js';
import { AddTableCustomColumnQuickAction } from './create-table-custom-column-config-change.js';

type PageName = 'listReport' | 'objectPage';

const LIST_REPORT_TYPE = 'sap.fe.templates.ListReport.ListReport';
const OBJECT_PAGE_TYPE = 'sap.fe.templates.ObjectPage.ObjectPage';

/**
 * Quick Action provider for SAP Fiori Elements V4 applications.
 */
export default class FEV4QuickActionRegistry extends QuickActionDefinitionRegistry<PageName> {
    PAGE_NAME_MAP: Record<string, PageName> = {
        [LIST_REPORT_TYPE]: 'listReport',
        [OBJECT_PAGE_TYPE]: 'objectPage'
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
                        EnableVariantManagementQuickAction,
                        ChangeTableActionsQuickAction,
                        ChangeTableColumnsQuickAction,
                        AddTableActionQuickAction,
                        AddTableCustomColumnQuickAction,
                        EnableTableFilteringQuickAction,
                        AddNewAnnotationFile,
                        AddNewSubpage
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
                        EnableVariantManagementQuickAction,
                        ChangeTableActionsQuickAction,
                        ChangeTableColumnsQuickAction,
                        AddTableActionQuickAction,
                        AddTableCustomColumnQuickAction,
                        EnableTableEmptyRowModeQuickAction,
                        AddNewAnnotationFile,
                        AddNewSubpage
                    ],
                    view,
                    key: name + index
                });
            }
        }
        return definitionGroups;
    }
}

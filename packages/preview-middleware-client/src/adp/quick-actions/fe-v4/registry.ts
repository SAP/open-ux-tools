import type {
    QuickActionActivationContext,
    QuickActionDefinitionGroup
} from '../../../cpe/quick-actions/quick-action-definition';
import { QuickActionDefinitionRegistry } from '../../../cpe/quick-actions/registry';

import { AddControllerToPageQuickAction } from '../common/add-controller-to-page';
import { ToggleClearFilterBarQuickAction } from './lr-toggle-clear-filter-bar';
import { ChangeTableColumnsQuickAction } from './change-table-columns';

type PageName = 'listReport' | 'objectPage';

const LIST_REPORT_TYPE = 'sap.fe.templates.ListReport.ListReport';
const OBJECT_PAGE_TYPE = 'sap.fe.templates.ObjectPage.ObjectPage';

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
                    title: 'List Report',
                    definitions: [
                        ToggleClearFilterBarQuickAction,
                        AddControllerToPageQuickAction,
                        ChangeTableColumnsQuickAction
                    ],
                    view,
                    key: name + index
                });
            } else if (name === 'objectPage') {
                definitionGroups.push({
                    title: 'Object Page',
                    definitions: [AddControllerToPageQuickAction, ChangeTableColumnsQuickAction],
                    view,
                    key: name + index
                });
            }
        }
        return definitionGroups;
    }
 
}
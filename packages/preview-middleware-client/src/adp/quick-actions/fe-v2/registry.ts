import XMLView from 'sap/ui/core/mvc/XMLView';

import type {
    QuickActionActivationContext,
    QuickActionDefinitionGroup
} from '../../../cpe/quick-actions/quick-action-definition';
import { QuickActionDefinitionRegistry } from '../../../cpe/quick-actions/registry';

import { AddControllerToPageQuickAction } from '../common/add-controller-to-page';

import { ToggleClearFilterBarQuickAction } from './lr-toggle-clear-filter-bar';
import { ChangeTableColumnsQuickAction } from './change-table-columns';
import { AddHeaderFieldQuickAction } from '../common/op-add-header-field';
import Control from 'sap/ui/core/Control';

type PageName = 'listReport' | 'objectPage';

const OBJECT_PAGE_TYPE = 'sap.suite.ui.generic.template.ObjectPage.view.Details';
const LIST_REPORT_TYPE = 'sap.suite.ui.generic.template.ListReport.view.ListReport';

/**
 * Quick Action provider for SAP Fiori Elements V2 applications.
 */
export default class FEV2QuickActionRegistry extends QuickActionDefinitionRegistry<PageName> {
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
                        ToggleClearFilterBarQuickAction,
                        AddControllerToPageQuickAction,
                        ChangeTableColumnsQuickAction
                    ],
                    view,
                    key: name + index
                });
            } else if (name === 'objectPage') {
                definitionGroups.push({
                    title: 'OBJECT PAGE',
                    definitions: [
                        AddControllerToPageQuickAction,
                        ChangeTableColumnsQuickAction,
                        AddHeaderFieldQuickAction
                    ],
                    view,
                    key: name + index
                });
            }
        }
        return definitionGroups;
    }

    protected getComponentContainerFromPage(page: Control): Control | undefined {
        if (page instanceof XMLView) {
            return page.getContent()[0];
        }
        return undefined;
    }

}

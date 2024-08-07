import XMLView from 'sap/ui/core/mvc/XMLView';
import Log from 'sap/base/Log';

import type { QuickActionActivationContext, QuickActionDefinitionGroup } from '../quick-action-definition';
import { QuickActionDefinitionRegistry } from '../registry';
import type { ControlTreeIndex } from '../../types';

import { AddControllerToPageQuickAction } from '../common/add-controller-to-page';

import { ToggleClearFilterBarQuickAction } from './lr-toggle-clear-filter-bar';
import { ChangeTableColumnsQuickAction } from './change-table-columns';

type PageName = 'listReport' | 'objectPage';

const OBJECT_PAGE_TYPE = 'sap.suite.ui.generic.template.ObjectPage.view.Details';
const LIST_REPORT_TYPE = 'sap.suite.ui.generic.template.ListReport.view.ListReport';

const PAGE_NAME_MAP: Record<string, PageName> = {
    [LIST_REPORT_TYPE]: 'listReport',
    [OBJECT_PAGE_TYPE]: 'objectPage'
};

interface ActivePage {
    name: PageName;
    view: XMLView;
}

export default class FEV2QuickActionRegistry extends QuickActionDefinitionRegistry {
    getDefinitions(context: QuickActionActivationContext): QuickActionDefinitionGroup[] {
        const activePages = this.getActivePageContent(context.controlIndex);

        return activePages
            .map(({ name, view }, i) => {
                if (name === 'listReport') {
                    return {
                        title: 'List Report',
                        definitions: [
                            ToggleClearFilterBarQuickAction,
                            AddControllerToPageQuickAction,
                            ChangeTableColumnsQuickAction
                        ],
                        view,
                        key: name + i
                    };
                } else if (name === 'objectPage') {
                    return {
                        title: 'Object Page',
                        definitions: [AddControllerToPageQuickAction, ChangeTableColumnsQuickAction],
                        view,
                        key: name + i
                    };
                }
                return undefined;
            })
            .filter((definition) => !!definition);
    }

    private getActivePageContent(controlIndex: ControlTreeIndex): ActivePage[] {
        const views = this.getActiveViews(controlIndex);
        const pages: ActivePage[] = [];
        for (const view of views) {
            const name = view.getViewName();
            const pageName = PAGE_NAME_MAP[name];
            if (pageName) {
                pages.push({
                    name: pageName,
                    view
                });
            } else {
                Log.warning(`Could not find matching page for view of type "${name}".`);
            }
        }
        return pages;
    }
}

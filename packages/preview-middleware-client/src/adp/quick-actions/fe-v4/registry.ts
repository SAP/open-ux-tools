import ComponentContainer from 'sap/ui/core/ComponentContainer';
import UIComponent from 'sap/ui/core/UIComponent';
import Log from 'sap/base/Log';
import XMLView from 'sap/ui/core/mvc/XMLView';

import { getComponent } from '../../../cpe/ui5-utils';
import type { ControlTreeIndex } from '../../../cpe/types';
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

const PAGE_NAME_MAP: Record<string, PageName> = {
    [LIST_REPORT_TYPE]: 'listReport',
    [OBJECT_PAGE_TYPE]: 'objectPage'
};

interface ActivePage {
    name: PageName;
    view: XMLView;
}

export default class FEV4QuickActionRegistry extends QuickActionDefinitionRegistry {
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

    private getActiveViews(controlIndex: ControlTreeIndex): XMLView[] {
        const pages = this.getActivePages(controlIndex);

        const views = pages
            .map((page): XMLView | undefined => {
                if (page instanceof ComponentContainer) {
                    const componentId = page.getComponent();
                    const component = getComponent(componentId);
                    if (component instanceof UIComponent) {
                        const rootControl = component.getRootControl();
                        if (rootControl instanceof XMLView) {
                            return rootControl;
                        }
                    }
                }

                return undefined;
            })
            .filter((view: XMLView | undefined): view is XMLView => view !== undefined);
        return views;
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

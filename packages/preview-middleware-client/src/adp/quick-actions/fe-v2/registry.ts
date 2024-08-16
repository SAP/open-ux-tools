import XMLView from 'sap/ui/core/mvc/XMLView';
import Log from 'sap/base/Log';
import ComponentContainer from 'sap/ui/core/ComponentContainer';
import UIComponent from 'sap/ui/core/UIComponent';

import { getComponent } from '../../../cpe/ui5-utils';
import type {
    QuickActionActivationContext,
    QuickActionDefinitionGroup
} from '../../../cpe/quick-actions/quick-action-definition';
import { QuickActionDefinitionRegistry } from '../../../cpe/quick-actions/registry';
import type { ControlTreeIndex } from '../../../cpe/types';

import { AddControllerToPageQuickAction } from '../common/add-controller-to-page';

import { ToggleClearFilterBarQuickAction } from './lr-toggle-clear-filter-bar';
import { ChangeTableColumnsQuickAction } from './change-table-columns';
import { AddHeaderFieldQuickAction } from './op-add-header-field';

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
    private getActiveViews(controlIndex: ControlTreeIndex): XMLView[] {
        const pages = this.getActivePages(controlIndex);

        const views = pages
            .map((page): XMLView | undefined => {
                if (page instanceof XMLView) {
                    const container = page.getContent()[0];
                    if (container instanceof ComponentContainer) {
                        const componentId = container.getComponent();
                        const component = getComponent(componentId);
                        if (component instanceof UIComponent) {
                            const rootControl = component.getRootControl();
                            if (rootControl instanceof XMLView) {
                                return rootControl;
                            }
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

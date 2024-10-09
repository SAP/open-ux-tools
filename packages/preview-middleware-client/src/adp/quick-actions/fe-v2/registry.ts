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
import { AddPageActionQuickAction } from '../fe-v2/create-page-action';
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
                        ChangeTableColumnsQuickAction,
                        AddTableActionQuickAction,
                        AddPageActionQuickAction
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
                        AddHeaderFieldQuickAction,
                        AddCustomSectionQuickAction,
                        AddTableActionQuickAction,
                        AddPageActionQuickAction
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

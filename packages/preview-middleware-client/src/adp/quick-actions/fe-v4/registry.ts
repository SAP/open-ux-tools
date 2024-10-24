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
import { AddPageActionQuickAction } from '../common/create-page-action';
import { AddTableActionQuickAction } from './create-table-action';
import { getUi5Version, isLowerThanMinimalUi5Version, Ui5VersionInfo } from '../../../utils/version';

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

    ui5VersionInfo: Ui5VersionInfo;
    async initialize() {
        this.ui5VersionInfo = await getUi5Version();
    }
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
                        AddTableActionQuickAction
                    ],
                    view,
                    key: name + index
                });
                if (!isLowerThanMinimalUi5Version(this.ui5VersionInfo, { major: 1, minor: 129 })) {
                    definitionGroups[index].definitions.push(AddPageActionQuickAction);
                }
            } else if (name === 'objectPage') {
                definitionGroups.push({
                    title: 'OBJECT PAGE',
                    definitions: [
                        AddControllerToPageQuickAction,
                        ChangeTableColumnsQuickAction,
                        AddHeaderFieldQuickAction,
                        AddCustomSectionQuickAction,
                        AddTableActionQuickAction
                    ],
                    view,
                    key: name + index
                });
                if (!isLowerThanMinimalUi5Version(this.ui5VersionInfo, { major: 1, minor: 129 })) {
                    definitionGroups[index].definitions.push(AddPageActionQuickAction);
                }
            }
        }
        return definitionGroups;
    }
}

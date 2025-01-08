import Table from 'sap/ui/mdc/Table';
import FlexRuntimeInfoAPI from 'sap/ui/fl/apply/api/FlexRuntimeInfoAPI';

import type { NestedQuickActionChild, NestedQuickAction } from '@sap-ux-private/control-property-editor-common';
import { NESTED_QUICK_ACTION_KIND } from '@sap-ux-private/control-property-editor-common';

import { QuickActionContext } from '../../../cpe/quick-actions/quick-action-definition';
import { getRelevantControlFromActivePage } from '../../../cpe/quick-actions/utils';
import { EnablementValidator } from '../enablement-validator';
import { QuickActionDefinitionBase } from '../quick-action-base';

const ACTION_ID = 'CTX_SETTINGS0';

export abstract class TableQuickActionDefinitionBase extends QuickActionDefinitionBase<
    typeof NESTED_QUICK_ACTION_KIND
> {
    isApplicable = false;

    isClearButtonEnabled = false;
    children: NestedQuickActionChild[] = [];
    tableMap: Record<string, number> = {};
    constructor(
        public readonly type: string,
        protected readonly controlTypes: string[],
        protected readonly defaultTextKey: string,
        protected readonly context: QuickActionContext,
        protected readonly isSkipVariantManagementCheck?: boolean,
        protected readonly enablementValidators: EnablementValidator[] = []
    ) {
        super(type, NESTED_QUICK_ACTION_KIND, defaultTextKey, context, enablementValidators);
    }

    async initialize(): Promise<void> {
        let index = 0;
        for (const smartTable of getRelevantControlFromActivePage(
            this.context.controlIndex,
            this.context.view,
            this.controlTypes
        )) {
            if (!this.isSkipVariantManagementCheck) {
                const hasVariantManagement = FlexRuntimeInfoAPI.hasVariantManagement({ element: smartTable });
                if (!hasVariantManagement) {
                    continue;
                }
            }

            const actions = await this.context.actionService.get(smartTable.getId());
            const changeColumnAction = actions.find((action) => action.id === ACTION_ID);
            if (changeColumnAction) {
                this.children.push({
                    label: `'${(smartTable as Table).getHeader()}' table`,
                    enabled: true,
                    children: []
                });
                this.tableMap[`${this.children.length - 1}`] = index;
                index++;
            }
        }

        if (this.children.length > 0) {
            this.isApplicable = true;
        }
    }

    getActionObject(): NestedQuickAction {
        return {
            kind: NESTED_QUICK_ACTION_KIND,
            id: this.id,
            enabled: !this.isDisabled,
            tooltip: this.tooltip,
            title: this.context.resourceBundle.getText(this.textKey),
            children: this.children
        };
    }
}

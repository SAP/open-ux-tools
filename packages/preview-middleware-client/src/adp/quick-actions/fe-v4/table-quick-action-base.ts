import Table from 'sap/ui/mdc/Table';
import FlexRuntimeInfoAPI from 'sap/ui/fl/apply/api/FlexRuntimeInfoAPI';

import type { NestedQuickActionChild, NestedQuickAction } from '@sap-ux-private/control-property-editor-common';
import { NESTED_QUICK_ACTION_KIND } from '@sap-ux-private/control-property-editor-common';

import { QuickActionContext } from '../../../cpe/quick-actions/quick-action-definition';
import { getRelevantControlFromActivePage } from '../../../cpe/quick-actions/utils';
import { EnablementValidator, EnablementValidatorError, EnablementValidatorResult } from '../enablement-validator';

const ACTION_ID = 'CTX_SETTINGS0';
const CONTROL_TYPE = 'sap.ui.mdc.Table';
export abstract class TableQuickActionDefinitionBase {
    readonly kind = NESTED_QUICK_ACTION_KIND;
    public get id(): string {
        return `${this.context.key}-${this.type}`;
    }
    protected get textKey(): string {
        return this.defaultTextKey;
    }
    isApplicable = false;

    protected validationResult: EnablementValidatorResult[] | undefined;
    protected get isDisabled(): boolean {
        if (this.validationResult === undefined) {
            return false;
        }
        const validationErrors = this.validationResult.filter((result) => result?.type === 'error');
        return validationErrors.length > 0;
    }

    public get tooltip(): string | undefined {
        if (this.validationResult) {
            const validationErrors = this.validationResult.filter(
                (result): result is EnablementValidatorError => result?.type === 'error'
            );
            if (validationErrors.length > 0) {
                const error = validationErrors[0];
                return error.message;
            }
        }
        return undefined;
    }

    isClearButtonEnabled = false;
    children: NestedQuickActionChild[] = [];
    tableMap: Record<string, number> = {};
    constructor(
        public readonly type: string,
        protected readonly defaultTextKey: string,
        protected readonly context: QuickActionContext,
        protected readonly isSkipVariantManagementCheck?: boolean,
        protected readonly enablementValidators: EnablementValidator[] = []
    ) {}

    async initialize(): Promise<void> {
        let index = 0;
        for (const smartTable of getRelevantControlFromActivePage(this.context.controlIndex, this.context.view, [
            CONTROL_TYPE
        ])) {
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

    async runEnablementValidators(): Promise<void> {
        this.validationResult = await Promise.all(
            this.enablementValidators.map(async (validator) => await validator.run())
        );
    }
}

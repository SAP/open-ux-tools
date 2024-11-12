import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import { QuickActionContext, SimpleQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
import { getRelevantControlFromActivePage, pageHasControlId } from '../../../cpe/quick-actions/utils';
import { getControlById } from '../../../utils/core';
import { SimpleQuickActionDefinitionBase } from '../simple-quick-action-base';
import { GRID_TABLE_TYPE, M_TABLE_TYPE, SMART_TABLE_TYPE, TREE_TABLE_TYPE } from '../table-quick-action-base';
import { executeToggleAction } from './utils';

export const ENABLE_TABLE_FILTERING = 'enable-table-filtering';
// TODO: specify correct ones
const CONTROL_TYPES = [SMART_TABLE_TYPE, M_TABLE_TYPE, TREE_TABLE_TYPE, GRID_TABLE_TYPE];

/**
 * Quick Action for toggling the visibility of "clear filter bar" button in List Report page.
 */
export class EnableTableFilteringQuickAction
    extends SimpleQuickActionDefinitionBase
    implements SimpleQuickActionDefinition
{
    constructor(context: QuickActionContext) {
        super(ENABLE_TABLE_FILTERING, [], '', context);
    }

    readonly forceRefreshAfterExecution = true;
    private isTableFilteringInPageVariantEnabled = false;

    initialize(): void {
        for (const control of getRelevantControlFromActivePage(
            this.context.controlIndex,
            this.context.view,
            CONTROL_TYPES
        )) {
            const isActionApplicable = pageHasControlId(this.context.view, control.getId());
            const modifiedControl = getControlById(control.getId());
            if (isActionApplicable && modifiedControl) {
                this.isTableFilteringInPageVariantEnabled = modifiedControl.data('p13nDialogSettings').filter.visible;
                this.control = modifiedControl;
            }
        }
    }

    protected get textKey() {
        return this.isTableFilteringInPageVariantEnabled
            ? 'V2_QUICK_ACTION_LR_DISABLE_TABLE_FILTERING'
            : 'V2_QUICK_ACTION_LR_ENABLE_TABLE_FILTERING';
    }

    async execute(): Promise<FlexCommand[]> {
        const command = await executeToggleAction(
            this.context,
            this.isTableFilteringInPageVariantEnabled,
            'component/settings',
            this.control!,
            {
                enableTableFilterInPageVariant: !this.isTableFilteringInPageVariantEnabled
            }
        );
        if (command.length) {
            this.isTableFilteringInPageVariantEnabled = !this.isTableFilteringInPageVariantEnabled;
        }
        return command;
    }
}

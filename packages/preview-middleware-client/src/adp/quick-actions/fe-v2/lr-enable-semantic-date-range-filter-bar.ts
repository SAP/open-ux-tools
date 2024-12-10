import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import type FilterBar from 'sap/ui/comp/filterbar/FilterBar';
import { QuickActionContext, SimpleQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
import { pageHasControlId } from '../../../cpe/quick-actions/utils';
import { getControlById, isA } from '../../../utils/core';
import { SimpleQuickActionDefinitionBase } from '../simple-quick-action-base';
import { areManifestChangesSupported, prepareManifestChange } from './utils';
import SmartFilterBar from 'sap/ui/comp/smartfilterbar/SmartFilterBar';

export const ENABLE_SEMANTIC_DATE_RANGE_FILTER_BAR = 'enable-semantic-daterange-filterbar';
const CONTROL_TYPE = 'sap.ui.comp.smartfilterbar.SmartFilterBar';
const COMPONENT = 'sap.suite.ui.generic.template.ListReport';
/**
 * Quick Action for toggling the visibility of "semantic date range" for filterbar fields.
 */
export class ToggleSemanticDateRangeFilterBar
    extends SimpleQuickActionDefinitionBase
    implements SimpleQuickActionDefinition
{
    constructor(context: QuickActionContext) {
        super(ENABLE_SEMANTIC_DATE_RANGE_FILTER_BAR, [], '', context);
    }
    readonly forceRefreshAfterExecution = true;
    private isUseDateRangeTypeEnabled = false;

    async initialize(): Promise<void> {
        const manifestChangesSupported = await areManifestChangesSupported(this.context.manifest);
        if (!manifestChangesSupported) {
            return;
        }
        const controls = this.context.controlIndex[CONTROL_TYPE] ?? [];
        for (const control of controls) {
            const isActionApplicable = pageHasControlId(this.context.view, control.controlId);
            const modifiedControl = getControlById<FilterBar>(control.controlId);
            if (isActionApplicable && modifiedControl) {
                this.isUseDateRangeTypeEnabled = modifiedControl.getProperty('useDateRangeType');
                this.control = modifiedControl;
            }
        }
    }

    protected get textKey() {
        return this.isUseDateRangeTypeEnabled
            ? 'QUICK_ACTION_LR_DISABLE_SEMANTIC_DATE_RANGE_FILTER_BAR'
            : 'QUICK_ACTION_LR_ENABLE_SEMANTIC_DATE_RANGE_FILTER_BAR';
    }

    async execute(): Promise<FlexCommand[]> {
        const entitySet = isA<SmartFilterBar>(CONTROL_TYPE, this.control) ? this.control.getEntitySet() : undefined;
        const command = await prepareManifestChange(
            this.context,
            'component/settings/filterSettings/dateSettings',
            this.control!,
            COMPONENT,
            entitySet,
            {
                useDateRange: !this.isUseDateRangeTypeEnabled
            }
        );

        this.isUseDateRangeTypeEnabled = !this.isUseDateRangeTypeEnabled;

        return command;
    }
}

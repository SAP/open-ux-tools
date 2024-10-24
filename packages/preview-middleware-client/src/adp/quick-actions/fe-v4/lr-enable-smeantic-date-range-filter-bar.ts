import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import CommandFactory from 'sap/ui/rta/command/CommandFactory';
import FilterBar from 'sap/ui/mdc/FilterBar';

import { QuickActionContext, SimpleQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
import { pageHasControlId } from '../../../cpe/quick-actions/utils';
import { getControlById } from '../../../utils/core';
import { getAppComponent, getPageName, getReference } from './utils';
import { SimpleQuickActionDefinitionBase } from '../simple-quick-action-base';

export const ENABLE_SEMANTIC_DATE_RANGE = 'enable-semantic-date-range';
const PROPERTY_PATH = 'controlConfiguration/@com.sap.vocabularies.UI.v1.SelectionFields/useSemanticDateRange';
const CONTROL_TYPE = 'sap.fe.macros.controls.FilterBar';
const boolMap: { [key: string]: boolean } = {
    'true': true,
    'false': false,
};
/**
 * Quick Action for toggling the visibility of "Semantic date range" for filter bar fields in LR.
 */
export class ToggleSemanticDateRangeFilterBar
    extends SimpleQuickActionDefinitionBase
    implements SimpleQuickActionDefinition
{
    constructor(context: QuickActionContext) {
        super(ENABLE_SEMANTIC_DATE_RANGE, [], '', context);
    }
    readonly forceRefreshAfterExecution = true;
    private isUseDateRangeTypeEnabled = false;

    async initialize(): Promise<void> {
        const controls = this.context.controlIndex[CONTROL_TYPE] ?? [];
        for (const control of controls) {
            const isActionApplicable = pageHasControlId(this.context.view, control.controlId);
            const filterBar = getControlById<FilterBar>(control.controlId);
            if (isActionApplicable && filterBar) {
                this.control = filterBar;
                this.isUseDateRangeTypeEnabled = boolMap[this.control.data('useSemanticDateRange')];
            }
        }
    }

    protected get textKey() {
        return this.isUseDateRangeTypeEnabled
            ? 'V4_QUICK_ACTION_LR_DISABLE_SEMANTIC_DATE_RANGE_FILTER_BAR'
            : 'V4_QUICK_ACTION_LR_ENABLE_SEMANTIC_DATE_RANGE_FILTER_BAR';
    }

    async execute(): Promise<FlexCommand[]> {
        const controls = this.context.controlIndex[CONTROL_TYPE] ?? [];
        const control = controls[0];
        if (control) {
            const modifiedControl = getControlById(control.controlId);
            if (!modifiedControl) {
                return [];
            }

            const { flexSettings } = this.context;
            const parent = modifiedControl.getParent();
            if (!parent) {
                return [];
            }

            const modifiedValue = {
                reference: getReference(modifiedControl),
                appComponent: getAppComponent(modifiedControl),
                changeType: 'appdescr_fe_changePageConfiguration',
                parameters: {
                    page: getPageName(parent),
                    entityPropertyChange: {
                        propertyPath: PROPERTY_PATH,
                        propertyValue: !this.isUseDateRangeTypeEnabled,
                        operation: 'UPSERT'
                    }
                }
            };

            const command = await CommandFactory.getCommandFor<FlexCommand>(
                modifiedControl,
                'appDescriptor',
                modifiedValue,
                null,
                flexSettings
            );

            return [command];
        }

        return [];
    }
}

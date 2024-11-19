import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import CommandFactory from 'sap/ui/rta/command/CommandFactory';
import type FilterBar from 'sap/ui/comp/filterbar/FilterBar';
import SmartFilterBar from 'sap/ui/comp/smartfilterbar/SmartFilterBar';

import { FeatureService } from '../../../cpe/feature-service';
import { QuickActionContext, SimpleQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
import { pageHasControlId } from '../../../cpe/quick-actions/utils';
import { getControlById } from '../../../utils/core';
import { SimpleQuickActionDefinitionBase } from '../simple-quick-action-base';
import { getUi5Version, isEqualToUi5Version, isLowerThanMinimalUi5Version } from '../../../utils/version';

export const ENABLE_SEMANTIC_DATE_RANGE_FILTER_BAR = 'enable-semantic-daterange-filterbar';
const CONTROL_TYPE = 'sap.ui.comp.smartfilterbar.SmartFilterBar';

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
        const version = await getUi5Version();
        const isUI5VersionNotSupported =
            isLowerThanMinimalUi5Version(version, { major: 1, minor: 128 }) &&
            !(
                isEqualToUi5Version(version, { major: 1, minor: 96, patch: 37 }) ||
                isEqualToUi5Version(version, { major: 1, minor: 108, patch: 38 }) ||
                isEqualToUi5Version(version, { major: 1, minor: 120, patch: 23 })
            );

        if (isUI5VersionNotSupported) {
            return;
        }
        if (FeatureService.isFeatureEnabled('cpe.beta.quick-actions') === false) {
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
            ? 'V2_QUICK_ACTION_LR_DISABLE_SEMANTIC_DATE_RANGE_FILTER_BAR'
            : 'V2_QUICK_ACTION_LR_ENABLE_SEMANTIC_DATE_RANGE_FILTER_BAR';
    }

    async execute(): Promise<FlexCommand[]> {
        const { flexSettings } = this.context;

        const modifiedValue = {
            changeType: 'appdescr_ui_generic_app_changePageConfiguration',
            reference: flexSettings.projectId,
            parameters: {
                parentPage: {
                    component: 'sap.suite.ui.generic.template.ListReport',
                    entitySet: (this.control as SmartFilterBar).getEntitySet()
                },
                entityPropertyChange: {
                    propertyPath: 'component/settings/filterSettings/dateSettings',
                    operation: 'UPSERT',
                    propertyValue: {
                        useDateRange: !this.isUseDateRangeTypeEnabled
                    }
                }
            }
        };
        const command = await CommandFactory.getCommandFor<FlexCommand>(
            this.control!,
            'appDescriptor',
            modifiedValue,
            null,
            flexSettings
        );

        this.isUseDateRangeTypeEnabled = !this.isUseDateRangeTypeEnabled;
        return [command];
    }
}

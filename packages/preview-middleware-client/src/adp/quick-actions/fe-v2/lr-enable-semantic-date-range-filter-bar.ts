import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import { QuickActionContext, SimpleQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
import { pageHasControlId } from '../../../cpe/quick-actions/utils';
import { getControlById, isA } from '../../../utils/core';
import { SimpleQuickActionDefinitionBase } from '../simple-quick-action-base';
import { areManifestChangesSupported, prepareManifestChange } from './utils';
import { getUi5Version, isLowerThanMinimalUi5Version } from '../../../utils/version';
import SmartFilterBar from 'sap/ui/comp/smartfilterbar/SmartFilterBar';

export const ENABLE_SEMANTIC_DATE_RANGE_FILTER_BAR = 'enable-semantic-daterange-filterbar';
const CONTROL_TYPE_LR = 'sap.ui.comp.smartfilterbar.SmartFilterBar';
const CONTROL_TYPE_ALP = 'sap.suite.ui.generic.template.AnalyticalListPage.control.SmartFilterBarExt';
const COMPONENT_LR = 'sap.suite.ui.generic.template.ListReport';
const COMPONENT_ALP = 'sap.suite.ui.generic.template.AnalyticalListPage';

/**
 * Quick Action for toggling the visibility of "semantic date range" for filterbar fields.
 */
export class ToggleSemanticDateRangeFilterBar
    extends SimpleQuickActionDefinitionBase<SmartFilterBar>
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
        const controls = [
            ...(this.context.controlIndex[CONTROL_TYPE_LR] ?? []),
            ...(this.context.controlIndex[CONTROL_TYPE_ALP] ?? [])
        ];
        for (const control of controls) {
            const isActionApplicable = pageHasControlId(this.context.view, control.controlId);
            const modifiedControl = getControlById<SmartFilterBar>(control.controlId);
            if (isActionApplicable && modifiedControl) {
                this.control = modifiedControl;

                const id = (this.control.getProperty('persistencyKey') as unknown) ?? this.control.getId();
                if (typeof id !== 'string') {
                    throw new Error('Could not retrieve configuration property because control id is not valid!');
                }
                const value = this.context.changeService.getConfigurationPropertyValue(id, 'useDateRange');
                this.isUseDateRangeTypeEnabled =
                    value === undefined ? this.control.getUseDateRangeType() : (value as boolean);
            }
        }
    }

    protected get textKey() {
        return this.isUseDateRangeTypeEnabled
            ? 'QUICK_ACTION_LR_DISABLE_SEMANTIC_DATE_RANGE_FILTER_BAR'
            : 'QUICK_ACTION_LR_ENABLE_SEMANTIC_DATE_RANGE_FILTER_BAR';
    }

    async execute(): Promise<FlexCommand[]> {
        const version = await getUi5Version();
        const isLowerMinimalVersion = isLowerThanMinimalUi5Version(version, { major: 1, minor: 126 });
        let entitySet;
        if (isLowerMinimalVersion && isA<SmartFilterBar>(CONTROL_TYPE_LR, this.control)) {
            // In older versions of UI5, the getEntitySet method is unavailable, so this workaround has been introduced.
            const regex = /::([^:]+)--/;
            entitySet = regex.exec(this.control?.getId() ?? '')?.[1];
        } else {
            entitySet =
                isA<SmartFilterBar>(CONTROL_TYPE_LR, this.control) ||
                isA<SmartFilterBar>(CONTROL_TYPE_ALP, this.control)
                    ? this.control.getEntitySet()
                    : undefined;
        }
        const viewName = this.context.view.getViewName();
        const command = await prepareManifestChange(
            this.context,
            'component/settings/filterSettings/dateSettings',
            this.control!,
            viewName.includes('AnalyticalListPage') ? COMPONENT_ALP : COMPONENT_LR,
            entitySet,
            {
                useDateRange: !this.isUseDateRangeTypeEnabled
            }
        );

        return command;
    }
}

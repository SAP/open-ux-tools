import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import CommandFactory from 'sap/ui/rta/command/CommandFactory';
import FilterBar from 'sap/ui/mdc/FilterBar';

import { QuickActionContext, SimpleQuickActionDefinition } from '../quick-action-definition';
import { getAppComponent, getPageName, getReference, pageHasControlId } from '../utils';
import { SIMPLE_QUICK_ACTION_KIND, SimpleQuickAction } from '@sap-ux-private/control-property-editor-common';
import { getControlById } from '../../utils';

export const ENABLE_CLEAR_FILTER_BAR_TYPE = 'enable-clear-filter-bar';
const PROPERTY_PATH = 'controlConfiguration/@com.sap.vocabularies.UI.v1.SelectionFields/showClearButton';
const CONTROL_TYPE = 'sap.fe.macros.controls.FilterBar'; //'sap.ui.mdc.FilterField';
export class ToggleClearFilterBarQuickAction implements SimpleQuickActionDefinition {
    readonly kind = SIMPLE_QUICK_ACTION_KIND;
    readonly type = ENABLE_CLEAR_FILTER_BAR_TYPE;
    public get id(): string {
        return `${this.context.key}-${this.type}`;
    }
    isActive = false;
    private isClearButtonEnabled = false;
    private filterBar: FilterBar | undefined;
    constructor(private context: QuickActionContext) {}

    initialize(): void {
        const controls = this.context.controlIndex[CONTROL_TYPE];
        for (const control of controls) {
            const isActionApplicable = pageHasControlId(this.context.view, control.controlId);
            const filterBar = getControlById<FilterBar>(control.controlId);
            if (isActionApplicable && filterBar) {
                this.isActive = true;
                this.isClearButtonEnabled = filterBar.getShowClearButton();
                this.filterBar = filterBar;
            }
        }
    }

    getActionObject(): SimpleQuickAction {
        return {
            kind: SIMPLE_QUICK_ACTION_KIND,
            id: this.id,
            enabled: this.isActive,
            // TODO: translate this?
            title: `${this.isClearButtonEnabled ? 'Disable' : 'Enable'} clear filterbar button`
        };
    }

    async execute(): Promise<FlexCommand[]> {
        const controls = this.context.controlIndex[CONTROL_TYPE];
        const control = controls[0];
        if (control) {
            const modifiedControl = sap.ui.getCore().byId(control.controlId);
            if (!modifiedControl) {
                return [];
            }

            const flexSettings = this.context.rta.getFlexSettings();

            const modifiedValue = {
                reference: getReference(modifiedControl),
                appComponent: getAppComponent(modifiedControl),
                changeType: 'appdescr_fe_changePageConfiguration',
                parameters: {
                    page: getPageName(modifiedControl.getParent()),
                    entityPropertyChange: {
                        propertyPath: PROPERTY_PATH,
                        propertyValue: !this.isClearButtonEnabled,
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

            //await context.rta.getCommandStack().pushAndExecute(command);

            this.isClearButtonEnabled = !this.isClearButtonEnabled;
            return [command];
        }

        return [];
    }
}

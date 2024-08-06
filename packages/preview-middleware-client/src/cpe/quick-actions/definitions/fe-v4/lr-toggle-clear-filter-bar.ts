import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import CommandFactory from 'sap/ui/rta/command/CommandFactory';

import { QuickActionContext, SimpleQuickActionDefinition } from '../quick-action-definition';
import { getAppComponent, getCurrentActivePages, getPageName, getReference, pageHasControlId } from '../../utils';
import { SIMPLE_QUICK_ACTION_KIND, SimpleQuickAction } from '@sap-ux-private/control-property-editor-common';
import FilterBar from 'sap/ui/mdc/FilterBar';

export const ENABLE_CLEAR_FILTER_BAR_TYPE = 'enable-clear-filter-bar';
const PROPERTY_PATH = 'controlConfiguration/@com.sap.vocabularies.UI.v1.SelectionFields/showClearButton';
const CONTROL_TYPE = 'sap.fe.macros.controls.FilterBar'; //'sap.ui.mdc.FilterField';
export class ToggleClearFilterBarQuickAction implements SimpleQuickActionDefinition {
    readonly kind = SIMPLE_QUICK_ACTION_KIND;
    readonly type = ENABLE_CLEAR_FILTER_BAR_TYPE;
    isActive = false;
    isClearButtonEnabled = false;
    constructor(private context: QuickActionContext) {}

    initialize() {
        const controls = this.context.controlIndex[CONTROL_TYPE];
        if (controls?.length === 1) {
            const activePages = getCurrentActivePages(this.context.controlIndex);
            for (const activePage of activePages) {
                const control = controls[0];
                const isActionApplicable = pageHasControlId(activePage, control.controlId);
                const controlObj = sap.ui.getCore().byId(control.controlId);
                if (isActionApplicable && controlObj) {
                    this.isActive = true;
                    this.isClearButtonEnabled = (controlObj as FilterBar).getShowClearButton();
                    break;
                }
            }
        }
    }

    getActionObject(): SimpleQuickAction {
        return {
            kind: SIMPLE_QUICK_ACTION_KIND,
            type: this.type,
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

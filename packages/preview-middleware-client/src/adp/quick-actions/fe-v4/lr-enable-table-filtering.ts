import FlexCommand from 'sap/ui/rta/command/FlexCommand';

import { QuickActionContext, SimpleQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
import { SimpleQuickActionDefinitionBase } from '../simple-quick-action-base';

export const ENABLE_TABLE_FILTERING = 'enable-table-filtering';

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
    
    initialize(): void {
        // const controls = this.context.controlIndex[CONTROL_TYPE] ?? [];
        // for (const control of controls) {
        //     const isActionApplicable = pageHasControlId(this.context.view, control.controlId);
        //     const filterBar = getControlById<FilterBar>(control.controlId);
        //     if (isActionApplicable && filterBar) {
        //         this.control = filterBar;
        //         this.isClearButtonEnabled = filterBar.getShowClearButton();
        //     }
        // }
    }

    execute(): Promise<FlexCommand[]> {
        // const controls = this.context.controlIndex[CONTROL_TYPE] ?? [];
        // const control = controls[0];
        // if (control) {
        //     const modifiedControl = getControlById(control.controlId);
        //     if (!modifiedControl) {
        //         return [];
        //     }

        //     const { flexSettings } = this.context;
        //     const parent = modifiedControl.getParent();
        //     if (!parent) {
        //         return [];
        //     }

        //     const modifiedValue = {
        //         reference: getReference(modifiedControl),
        //         appComponent: getAppComponent(modifiedControl),
        //         changeType: 'appdescr_fe_changePageConfiguration',
        //         parameters: {
        //             page: getPageName(parent),
        //             entityPropertyChange: {
        //                 propertyPath: PROPERTY_PATH,
        //                 propertyValue: !this.isClearButtonEnabled,
        //                 operation: 'UPSERT'
        //             }
        //         }
        //     };

        //     const command = await CommandFactory.getCommandFor<FlexCommand>(
        //         modifiedControl,
        //         'appDescriptor',
        //         modifiedValue,
        //         null,
        //         flexSettings
        //     );

        //     this.isClearButtonEnabled = !this.isClearButtonEnabled;
        //     return [command];
        // }

        return [];
    }
}

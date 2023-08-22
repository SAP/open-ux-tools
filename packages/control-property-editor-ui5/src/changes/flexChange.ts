import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import CommandFactory from 'sap/ui/rta/command/CommandFactory';
import type { PropertyChange } from '@sap-ux/control-property-editor-common';
import { UI5AdaptationOptions } from '../types';

const developerMode = true;
const FLScenario = 'FE_FROM_SCRATCH';

/**
 *
 * @param options UI5 adaptation options
 * @param change
 */
export async function applyChange(options: UI5AdaptationOptions, change: PropertyChange): Promise<void> {
    const { layer, componentId, rta, generator } = options;
    const modifiedControl = sap.ui.getCore().byId(change.controlId);
    if (!modifiedControl) {
        return;
    }

    const flexSettings = {
        layer,
        developerMode,
        baseId: componentId,
        projectId: '',
        scenario: FLScenario,
        generator // this value is ignored by UI5 version prior to 1.107
    };

    const changeType =
        typeof change.value === 'string' && isBindingExpression(change.value) ? 'BindProperty' : 'Property';

    const modifiedValue =
        typeof change.value === 'string' && isBindingExpression(change.value)
            ? {
                  generator,
                  propertyName: change.propertyName,
                  newBinding: change.value
              }
            : {
                  generator,
                  propertyName: change.propertyName,
                  newValue: change.value
              };

    const command = await CommandFactory.getCommandFor<FlexCommand>(
        modifiedControl,
        changeType,
        modifiedValue,
        null,
        flexSettings
    );

    await rta.getCommandStack().pushAndExecute(command);
}

/**
 * Function to check a give value is a binding expression.
 *
 * @param value
 * @returns boolean
 */
function isBindingExpression(value: string): boolean {
    return value.includes('{') && value.includes('}');
}

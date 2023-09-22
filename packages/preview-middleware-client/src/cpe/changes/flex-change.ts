import type FlexCommand from 'sap/ui/rta/command/FlexCommand';
import CommandFactory from 'sap/ui/rta/command/CommandFactory';
import type { PropertyChange } from '@sap-ux-private/control-property-editor-common';
import type { UI5AdaptationOptions } from '../types';

/**
 * Function to check a give value is a binding expression.
 *
 * @param value value to be checked.
 * @returns boolean
 */
function isBindingExpression(value: string): boolean {
    return value.includes('{') && value.includes('}');
}

/**
 *
 * @param options UI5 adaptation options
 * @param change changed property of a control
 */
export async function applyChange(options: UI5AdaptationOptions, change: PropertyChange): Promise<void> {
    const { rta } = options;
    const modifiedControl = sap.ui.getCore().byId(change.controlId);
    if (!modifiedControl) {
        return;
    }

    const flexSettings = rta.getFlexSettings();

    const changeType =
        typeof change.value === 'string' && isBindingExpression(change.value) ? 'BindProperty' : 'Property';

    const property = typeof change.value === 'string' && isBindingExpression(change.value) ? 'newBinding' : 'newValue';
    const modifiedValue = {
        generator: flexSettings.generator,
        propertyName: change.propertyName,
        [property]: change.value
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

import type FlexCommand from 'sap/ui/rta/command/FlexCommand';
import CommandFactory from 'sap/ui/rta/command/CommandFactory';
import type { PropertyChange } from '@sap-ux-private/control-property-editor-common';
import type { UI5AdaptationOptions } from '../types';
import { validateBindingModel } from './validator';

/**
 * Function to check a give value is a binding expression.
 *
 * @param change changed property of a control
 * @returns boolean
 */
function isBindingExpression(change: PropertyChange): boolean {
    return typeof change.value === 'string' && change.value.includes('{') && change.value.includes('}');
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

    const isBindingString = isBindingExpression(change);
    const modifiedControlModifiedProperties = modifiedControl.getMetadata().getAllProperties()[change.propertyName];
    const isBindingModel = isBindingExpression(change) && modifiedControlModifiedProperties?.type === 'string';
    const flexSettings = rta.getFlexSettings();
    const changeType = isBindingString ? 'BindProperty' : 'Property';

    if (isBindingModel) {
        validateBindingModel(change.value as string);
    }

    const property = isBindingString ? 'newBinding' : 'newValue';
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

import type FlexCommand from 'sap/ui/rta/command/FlexCommand';
import CommandFactory from 'sap/ui/rta/command/CommandFactory';
import { PropertyType, type PropertyChange } from '@sap-ux-private/control-property-editor-common';
import type { UI5AdaptationOptions } from '../types';
import { validateBindingModel } from './validator';
import { createManifestPropertyChange } from '../../utils/fe-v4';
/**
 * Function to check a give value is a binding expression.
 *
 * @param value value to be checked.
 * @returns boolean
 */
function isBindingExpression(value: string): boolean {
    return value.includes('{') && value.includes('}') && value.indexOf('{') < value.indexOf('}');
}

/**
 *
 * @param options UI5 adaptation options
 * @param change changed property/app descriptor property  of a control
 */
export async function applyChange(options: UI5AdaptationOptions, change: PropertyChange): Promise<void> {
    const { rta } = options;

    const isBindingString = typeof change.value === 'string' && isBindingExpression(change.value);
    const flexSettings = rta.getFlexSettings();
    const modifiedControl = sap.ui.getCore().byId(change.controlId);
    if (!modifiedControl) {
        return;
    }

    if (change.propertyType === PropertyType.ControlProperty) {
        const modifiedControlModifiedProperties = modifiedControl.getMetadata().getAllProperties()[change.propertyName];
        const isBindingModel = isBindingString && modifiedControlModifiedProperties?.type === 'string';
        const changeType = isBindingString ? 'BindProperty' : 'Property';

        if (isBindingModel) {
            await validateBindingModel(modifiedControl, change.value as string);
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
    } else if (change.propertyType === PropertyType.Configuration) {
        const command = await createManifestPropertyChange(modifiedControl, flexSettings, { [change.propertyName]: change.value });
        if (command) {
            await rta.getCommandStack().pushAndExecute(command);
        } else {
            return;
        }
    }
}

import type FlexCommand from 'sap/ui/rta/command/FlexCommand';
import CommandFactory from 'sap/ui/rta/command/CommandFactory';
import type { PropertyChange } from '@sap-ux-private/control-property-editor-common';
import type { UI5AdaptationOptions } from '../types';
import { validateBindingModel } from './validator';
import ManagedObject from 'sap/ui/base/ManagedObject';
import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';
import ElementOverlay from 'sap/ui/dt/ElementOverlay';
import UI5Element from 'sap/ui/core/Element';
import OverlayUtil from 'sap/ui/dt/OverlayUtil';
import BaseCommand from 'sap/ui/rta/command/BaseCommand';
import { getReference } from '../../utils/application';

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
    const modifiedControl = sap.ui.getCore().byId(change.controlId);
    if (!modifiedControl) {
        return;
    }
    let command: BaseCommand;
    const isBindingString = typeof change.value === 'string' && isBindingExpression(change.value);
    const modifiedControlModifiedProperties = modifiedControl.getMetadata().getAllProperties()[change.propertyName];
    const flexSettings = rta.getFlexSettings();
    const overlay = getOverlay(modifiedControl);
    const overlayData = overlay?.getDesignTimeMetadata().getData();
    if (modifiedControlModifiedProperties && !overlayData?.properties?.[change.propertyName]?.ignore) {
        const isBindingModel = isBindingString && modifiedControlModifiedProperties?.type === 'string';
        const changeType = isBindingString ? 'BindProperty' : 'Property';

        if (isBindingModel) {
            validateBindingModel(modifiedControl, change.value as string);
        }

        const property = isBindingString ? 'newBinding' : 'newValue';
        const modifiedValue = {
            generator: flexSettings.generator,
            propertyName: change.propertyName,
            [property]: change.value
        };

        command = await CommandFactory.getCommandFor<FlexCommand>(
            modifiedControl,
            changeType,
            modifiedValue,
            null,
            flexSettings
        );
    } else {
        if (!overlay) return;
        const overlayData = overlay?.getDesignTimeMetadata().getData();
        const manifestPropertyPath = overlayData.manifestPropertyPath(modifiedControl);
        const [manifestPropertyChange] = overlayData.manifestPropertyChange(
            { [change.propertyName]: change.value },
            manifestPropertyPath,
            modifiedControl
        );

        const modifiedValue = {
            reference: getReference(modifiedControl),
            appComponent: manifestPropertyChange.appComponent,
            changeType: manifestPropertyChange.changeSpecificData.appDescriptorChangeType, // 'appdescr_fe_changePageConfiguration',
            parameters: manifestPropertyChange.changeSpecificData.content.parameters,
            selector: manifestPropertyChange.selector
        };

        // TODO> confirm whether confirmmposite command requuired
        // implementation missing for undo for appDedc command
        // const compositeCommand = await CommandFactory.getCommandFor(modifiedControl, 'composite');
        command = await CommandFactory.getCommandFor(
            modifiedControl,
            'appDescriptor',
            modifiedValue,
            null,
            flexSettings
        );
    }

    await rta.getCommandStack().pushAndExecute(command);
}

export const getOverlay = (control: UI5Element): ElementOverlay | undefined => {
    let controlOverlay = OverlayRegistry.getOverlay(control);
    if (!controlOverlay?.getDomRef()) {
        //look for closest control
        controlOverlay = OverlayUtil.getClosestOverlayFor(control);
    }

    return controlOverlay;
};

import { getControlById } from '../../../utils/core';
import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import { QuickActionContext } from '../../../cpe/quick-actions/quick-action-definition';
import CommandFactory from 'sap/ui/rta/command/CommandFactory';
import { getAppComponent, getPageName, getReference } from '../../../utils/fe-v4';
import UI5Element from 'sap/ui/core/Element';

export async function executeToggleAction(
    context: QuickActionContext,
    isButtonEnabled: boolean,
    controlType: string,
    propertyPath: string
): Promise<FlexCommand[]> {
    const controls = context.controlIndex[controlType] ?? [];
    const control = controls[0];
    if (control) {
        const modifiedControl = getControlById(control.controlId);
        if (!modifiedControl) {
            return [];
        }

        const { flexSettings } = context;
        const parent = modifiedControl.getParent();
        if (!parent) {
            return [];
        }

        const modifiedValue = {
            reference: getReference(modifiedControl),
            appComponent: getAppComponent(modifiedControl),
            changeType: 'appdescr_fe_changePageConfiguration',
            parameters: {
                page: getPageName(parent),
                entityPropertyChange: {
                    propertyPath: propertyPath,
                    propertyValue: !isButtonEnabled,
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

        return [command];
    }

    return [];
}


/**
 * Returns a map with control custom data for the given keys only
 * @param element - control UI5element
 * @param keys - keys for which custom data values are required
 * @returns - map object with custom data values
 */
export function getControlCustomData<K extends string>(element: UI5Element, keys: K[]): Record<K, unknown> {
    const result: Record<K, unknown> = {} as Record<K, unknown>;
    const customData = element.getCustomData();
    customData.forEach((entry) => {
        const entryKey = entry.getKey() as K;
        if (keys.includes(entryKey)) {
            result[entryKey] = entry.getValue() as unknown;
        }
    });
    return result;
}

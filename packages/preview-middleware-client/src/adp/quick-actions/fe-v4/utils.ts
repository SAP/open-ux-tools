import { getControlById } from '../../../utils/core';
import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import { QuickActionContext } from '../../../cpe/quick-actions/quick-action-definition';
import CommandFactory from 'sap/ui/rta/command/CommandFactory';
import { getAppComponent, getPageName, getReference } from '../../../utils/fe-v4';
import ManagedObject from 'sap/ui/base/ManagedObject';

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
 * Recursively searches element (Managed Object) parents by id
 * @param el element to search parents
 * @param id parent id to search
 * @returns parent element with the given id, if found, otherwise undefined
 */
export function findParentById(el: ManagedObject, id: string): ManagedObject | undefined {
    const parent = el.getParent();
    if (!parent) {
        return undefined;
    } else if (parent.getId() === id) {
        return parent;
    } else {
        return findParentById(parent, id);
    }
}

import { getControlById } from '../../../utils/core';
import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import { QuickActionContext } from '../../../cpe/quick-actions/quick-action-definition';
import CommandFactory from 'sap/ui/rta/command/CommandFactory';
import { getV4AppComponent, getPageName, getReference } from '../../../utils/fe-v4';

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
            appComponent: getV4AppComponent(modifiedControl),
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

const PATTERN_SUFFIX = ':?query:';

/**
 * Generates the pattern for a new route based on the input.
 *
 * @param sourceRoutePattern source page route pattern
 * @param navProperty navigation property name (used to build nav pattern for nested OP )
 * @param targetEntitySet navigation target entity set
 * @returns the generated pattern as string
 */
export function generateRoutePattern(
    sourceRoutePattern: string,
    navProperty: string,
    targetEntitySet: string
): string {
    const parts: string[] = [];
    const basePattern = sourceRoutePattern.replace(PATTERN_SUFFIX, '');
    if (basePattern) {
        parts.push(basePattern);
        parts.push('/');
        parts.push(navProperty);
    } else {
        parts.push(targetEntitySet);
    }
    parts.push(`({${targetEntitySet}Key})`);
    parts.push(PATTERN_SUFFIX);
    return parts.join('');
}

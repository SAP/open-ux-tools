import { getControlById, isA } from '../../../utils/core';
import type FlexCommand from 'sap/ui/rta/command/FlexCommand';
import type { QuickActionContext } from '../../../cpe/quick-actions/quick-action-definition';
import CommandFactory from 'sap/ui/rta/command/CommandFactory';
import { getV4AppComponent, getPageName, getReference } from '../../../utils/fe-v4';
import TableAPI from 'sap/fe/macros/table/TableAPI';
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
export function generateRoutePattern(sourceRoutePattern: string, navProperty: string, targetEntitySet: string): string {
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

export type MacroTable = TableAPI & {
    metaPath: string;
    contextPath: string;
};

/**
 * Get LineItem annotation - tries to use design-time helper if available, falls back to local implementation.
 *
 * @param table - table control
 * @returns LineItem annotation string
 */
export function getLineItemAnnotation(table: UI5Element): string | undefined {
    try {
        const helper = sap.ui.require('sap/fe/macros/table/designtime/Table.designtime.helper');
        if (helper && typeof helper.getLineItemAnnotation === 'function') {
            return helper.getLineItemAnnotation(table);
        }
    } catch {
        // Module not available or error occurred
    }
    return getLineItemAnnotationForTable(table);
}

/**
 * Get property path for table action.
 *
 * @param table - table control
 * @returns string
 */
export function getPropertyPath(table: UI5Element, property: 'actions' | 'columns' = 'actions'): string | undefined {
    const macroTable = table.getParent();
    const configPath = '';
    if (macroTable && isA<MacroTable>('sap.fe.macros.table.TableAPI', macroTable)) {
        const lineItemAnnotation = getLineItemAnnotation(macroTable);

        const navigationPath = macroTable.metaPath.split(macroTable.getProperty('contextPath'))[1];
        if (!lineItemAnnotation) {
            throw new Error('Line item annotation could not be determined for the table.');
        }
        if (navigationPath) {
            return configPath.concat(
                'controlConfiguration/',
                navigationPath.split('@')[0],
                lineItemAnnotation,
                `/${property}/`
            );
        } else {
            let contextString = macroTable.metaPath;
            const firstSlash = contextString.indexOf('/');
            if (firstSlash >= 0) {
                contextString = contextString.substring(firstSlash + 1);
            }
            const secondSlash = contextString.indexOf('/');
            if (secondSlash >= 0) {
                contextString = contextString.substring(0, secondSlash);
            }
            return configPath.concat(
                'controlConfiguration/',
                '/',
                contextString,
                '/',
                lineItemAnnotation,
                `/${property}/`
            );
        }
    }
    return undefined;
}

/**
 * Return the line item annotation that defines the table.
 * This may come from a Presentation Variant, a Selection Presentation Variant or the default.
 * @param table - The table control
 * @returns The line item annotation used to define the table
 */
function getLineItemAnnotationForTable(macroTable: UI5Element): string | undefined {
    let lineItemAnnotation: string | undefined = '';
    if (
        macroTable &&
        (isA<MacroTable>('sap.fe.macros.table.TableAPI', macroTable) ||
            isA<MacroTable>('sap.fe.macros.Table', macroTable))
    ) {
        const presentation = macroTable.getModel()?.getMetaModel()?.getObject(macroTable.metaPath);

        // default line item annotation
        if (!presentation.Visualizations && !presentation.PresentationVariant) {
            lineItemAnnotation = macroTable.metaPath.split('/').pop();
        } else if (presentation.Visualizations) {
            lineItemAnnotation = presentation.Visualizations[0].$AnnotationPath;
        } else if (presentation.PresentationVariant) {
            if (presentation.PresentationVariant.Visualizations) {
                lineItemAnnotation = presentation.PresentationVariant.Visualizations[0].$AnnotationPath;
            } else {
                const contextPath = macroTable.metaPath.startsWith('/')
                    ? macroTable.metaPath.split('@')[0]
                    : macroTable.contextPath;
                const pathForLineItems = contextPath + presentation.PresentationVariant.$Path;
                const presentationVariantType = macroTable.getModel()?.getMetaModel()?.getObject(pathForLineItems);
                lineItemAnnotation = presentationVariantType.Visualizations[0].$AnnotationPath;
            }
        }
    }
    return lineItemAnnotation;
}

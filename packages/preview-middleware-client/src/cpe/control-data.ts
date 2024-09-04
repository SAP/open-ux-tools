import type { Control, ControlProperty } from '@sap-ux-private/control-property-editor-common';
import {
    BOOLEAN_VALUE_TYPE,
    CHECKBOX_EDITOR_TYPE,
    DROPDOWN_EDITOR_TYPE,
    FLOAT_VALUE_TYPE,
    INPUT_EDITOR_TYPE,
    INTEGER_VALUE_TYPE,
    STRING_VALUE_TYPE,
    convertCamelCaseToPascalCase
} from '@sap-ux-private/control-property-editor-common';

import Utils from 'sap/ui/fl/Utils';
import type ManagedObject from 'sap/ui/base/ManagedObject';
import type ElementOverlay from 'sap/ui/dt/ElementOverlay';
import type { ManagedObjectMetadataProperties } from './utils';
import { UI5ControlProperty } from './types';
import DataType from 'sap/ui/base/DataType';

type AnalyzedType = Pick<UI5ControlProperty, 'isArray' | 'primitiveType' | 'ui5Type' | 'enumValues'>;

/**
 * A property is disabled if it is an array or the type is 'any'
 * - since  we currently don't have a good editor for it Otherwise, it is enabled.
 *
 * @param analyzedType - analyzed property type
 * @returns boolean
 */
function isPropertyEnabled(analyzedType: AnalyzedType): boolean {
    return !(analyzedType.isArray || analyzedType.primitiveType === 'any');
}

/**
 * Return if a control is enabled or not.
 *
 * @param analyzedType - analyzed property type
 * @param hasStableId - given control has stable id.
 * @param ignore - property that is ignored during design time
 * @param controlOverlay - element overlay
 * @returns boolean
 */
function isControlEnabled(
    analyzedType: AnalyzedType,
    hasStableId: boolean,
    ignore: boolean,
    controlOverlay?: ElementOverlay
): boolean {
    return (controlOverlay?.isSelectable() ?? false) && isPropertyEnabled(analyzedType) && hasStableId && !ignore;
}

/**
 * Match 'src' or any string starting or ending with 'icon' (case insensitive;).
 *
 * @param name icon name
 * @returns boolean
 */
function testIconPattern(name: string): boolean {
    // replace `/src|.*icon$|^icon.*/i`.test(property.name);
    // match 'src' or any string starting or ending with 'icon' (case insensitive;)
    const nameLc = (name || '').toLowerCase();
    return nameLc.indexOf('src') >= 0 || nameLc.startsWith('icon') || nameLc.endsWith('icon');
}

/**
 * Analyze property type string | boolean | enum.
 *
 * @param property control property
 * @returns AnalyzedType|undefined
 */
function analyzePropertyType(property: ManagedObjectMetadataProperties): AnalyzedType | undefined {
    const analyzedType: AnalyzedType = {
        primitiveType: 'any',
        ui5Type: null,
        enumValues: undefined,
        isArray: false
    };
    const propertyType = property?.getType();
    const typeName = propertyType?.getName();

    if (!property || !propertyType || !typeName) {
        return undefined;
    }

    // Check if array and determine property type (or component type)
    if (typeName.indexOf('[]') > 0) {
        analyzedType.primitiveType = typeName.substring(0, typeName.indexOf('[]'));
        analyzedType.isArray = true;
    }
    // Return if object or void type
    else if (['object', 'void', 'any'].includes(typeName)) {
        analyzedType.primitiveType = typeName;
    }
    // Type of control property is an elementary simple type
    else if (['boolean', 'string', 'int', 'float'].includes(typeName)) {
        analyzedType.primitiveType = typeName;
    }
    // Control type is a sap.ui.base.DataType or an enumeration type
    else {
        // Determine type from iFrame
        const propertyDataType = DataType.getType(typeName);

        // type which is not a DataType such as Control is not supported
        if (propertyDataType && !(propertyDataType instanceof DataType)) {
            return analyzedType;
        }
        // enum values are created differently and use DataType as prototype, which only has stubs for instance functions -> getName returns undefined
        // array and base types also return undefined, but we have already handled those above
        // https://github.com/SAP/openui5/blob/203ce22763a76e28b7a422f6c635a42480f733f1/src/sap.ui.core/src/sap/ui/base/DataType.js#L430
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        const name = (Object.getPrototypeOf(propertyDataType) as DataType).getName();
        if (!name) {
            analyzedType.primitiveType = 'enum';
        } else {
            analyzedType.primitiveType = name;
        }
        analyzedType.ui5Type = typeName;

        // Determine base type for SAP types
        if (analyzedType.primitiveType === 'enum' && typeof propertyDataType?.getEnumValues === 'function') {
            analyzedType.enumValues = propertyDataType.getEnumValues();
        }
    }

    return analyzedType;
}

/**
 * If rawValue is anything except an object like {} or a function, return it as-is,
 * If it is an object, stringify it.
 * If it is a function, return empty string.
 *
 * @param rawValue property value
 * @returns string
 */
function normalizeObjectPropertyValue(rawValue: unknown): unknown {
    if (typeof rawValue === 'object' && rawValue instanceof Object && !Array.isArray(rawValue)) {
        try {
            return JSON.stringify(rawValue);
        } catch (e) {
            if (e instanceof Error && e.message.toLowerCase().includes('converting circular structure to json')) {
                // some objects can be circular, e.g.:
                // var obj = {
                //    key1: value,
                //    key2: obj
                // }
                // and JSON.stringify can't handle that so we reach here.
                // however, postMessage can't handle that either, and throws:
                // "Failed to execute 'postMessage' on 'Window': An object could not be cloned".
                // so we need to check whether this is the failure and if so, don't return the rawValue,
                // but some default string to act as the property value.
                return '<Circular JSON cannot be displayed>';
            }

            return rawValue;
        }
    } else if (typeof rawValue === 'function') {
        return '';
    } else {
        return rawValue;
    }
}

interface NewControlData {
    id: string;
    name: string;
    newValue: unknown;
}

/**
 * Build control data.
 *
 * @param control - ui5 control
 * @param controlOverlay - element overlay
 * @param includeDocumentation - include documentation flag
 * @returns Promise<Control>
 */
export function buildControlData(control: ManagedObject, controlOverlay?: ElementOverlay): Control {
    const controlMetadata = control.getMetadata();
    const selectedControlName = controlMetadata.getName();
    const hasStableId = Utils.checkControlId(control);
    const controlProperties = controlOverlay ? controlOverlay.getDesignTimeMetadata().getData().properties : undefined;

    // Add the control's properties
    const allProperties = controlMetadata.getAllProperties() as unknown as {
        [name: string]: ManagedObjectMetadataProperties;
    };
    const propertyNames = Object.keys(allProperties);
    const properties: ControlProperty[] = [];
    for (const propertyName of propertyNames) {
        const property = allProperties[propertyName];

        const analyzedType = analyzePropertyType(property);
        if (!analyzedType) {
            continue;
        }
        // the default behavior is that the property is enabled
        // meaning it's not ignored during design time
        let ignore = false;
        if (controlProperties?.[property.name]) {
            // check whether the property should be ignored in design time or not
            // if it's 'undefined' then it's not considered when building isEnabled because it's 'true'
            ignore = controlProperties[property.name].ignore;
        }

        //updating i18n text for the control if bindingInfo has bindingString
        const controlNewData: NewControlData = {
            id: control.getId(),
            name: property.name,
            newValue: control.getProperty(property.name)
        };
        const bindingInfo: { bindingString?: string } = control.getBindingInfo(controlNewData.name) as {
            bindingString?: string;
        };
        if (bindingInfo?.bindingString !== undefined) {
            controlNewData.newValue = bindingInfo.bindingString;
        }

        // A property is enabled if:
        // 1. The property supports changes
        // 2. The control has stable ID
        // 3. It is not configured to be ignored in design time
        // 4. And control overlay is selectable
        const isEnabled = isControlEnabled(analyzedType, hasStableId, ignore, controlOverlay);

        const value = normalizeObjectPropertyValue(controlNewData.newValue);
        const isIcon =
            testIconPattern(property.name) &&
            selectedControlName !== 'sap.m.Image' &&
            analyzedType.ui5Type === 'sap.ui.core.URI';
        const ui5Type = analyzedType.ui5Type || undefined;
        const readableName = convertCamelCaseToPascalCase(property.name);
        switch (analyzedType.primitiveType) {
            case 'enum': {
                const values = analyzedType.enumValues ?? {};
                const options: { key: string; text: string }[] = Object.keys(values).map((key) => ({
                    key,
                    text: values[key]
                }));
                properties.push({
                    type: STRING_VALUE_TYPE,
                    editor: DROPDOWN_EDITOR_TYPE,
                    name: property.name,
                    readableName,
                    value: value as string,
                    isEnabled,
                    ui5Type,
                    options
                });
                break;
            }
            case 'string': {
                properties.push({
                    type: STRING_VALUE_TYPE,
                    editor: INPUT_EDITOR_TYPE,
                    name: property.name,
                    readableName,
                    value: value as string,
                    isEnabled,
                    isIcon,
                    ui5Type
                });
                break;
            }
            case 'int': {
                properties.push({
                    type: INTEGER_VALUE_TYPE,
                    editor: INPUT_EDITOR_TYPE,
                    name: property.name,
                    readableName,
                    value: value as number,
                    isEnabled,
                    ui5Type
                });
                break;
            }
            case 'float': {
                properties.push({
                    type: FLOAT_VALUE_TYPE,
                    editor: INPUT_EDITOR_TYPE,
                    name: property.name,
                    readableName,
                    value: value as number,
                    isEnabled,
                    ui5Type
                });
                break;
            }
            case 'boolean': {
                properties.push({
                    type: BOOLEAN_VALUE_TYPE,
                    editor: CHECKBOX_EDITOR_TYPE,
                    name: property.name,
                    readableName,
                    value: value as boolean,
                    isEnabled,
                    ui5Type
                });
                break;
            }
        }
    }
    return {
        id: control.getId(), //the id of the underlying control/aggregation
        type: selectedControlName, //the name of the ui5 class of the control/aggregation
        properties: [...properties].sort((a, b) => (a.name > b.name ? 1 : -1)),
        name: selectedControlName
    };
}

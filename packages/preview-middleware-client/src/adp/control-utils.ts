/* eslint-disable consistent-return */
import Utils from 'sap/ui/fl/Utils';
import DataType from 'sap/ui/base/DataType';
import type ElementOverlay from 'sap/ui/dt/ElementOverlay';
import type ManagedObject from 'sap/ui/base/ManagedObject';
import type { MetadataOptions } from 'sap/ui/base/ManagedObject';

declare const jQuery: {
    sap: {
        getObject: (object: unknown) => { [key: string]: string };
    };
};

export interface BuiltRuntimeControl {
    id: string;
    type: string;
    properties: Properties[];
    name: string;
}

export interface Properties {
    type: string;
    editor: string;
    name: string;
    readableName: string;
    value: unknown | boolean;
    isEnabled: boolean;
    documentation: object;
    options?: { key: string; text: string }[];
    isIcon?: boolean;
}

export interface AnalyzedType {
    primitiveType: string;
    ui5Type: string | null;
    enumValues: { [key: string]: string } | null;
    isArray: boolean;
}

export type ControlNewData = {
    id: any;
    name: any;
    newValue: any;
};

export type MetadataOptionsProperty = MetadataOptions.Property & {
    name: string;
    getType(): {
        getName(): string;
    };
};

/**
 * Handles calling control specific functions for retrieving control data
 */
export default class ControlUtils {
    /**
     * Analyzed type
     */
    private static analyzedType: AnalyzedType;

    /**
     * Returns ManagedObject runtime control
     *
     * @param overlayControl Overlay
     * @returns {ManagedObject} Managed Object instance
     */
    public static getRuntimeControl(overlayControl: ElementOverlay): ManagedObject {
        let runtimeControl;
        if (overlayControl.getElementInstance) {
            runtimeControl = overlayControl.getElementInstance();
        } else {
            runtimeControl = overlayControl.getElement();
        }
        return runtimeControl;
    }

    /**
     * Returns control aggregation names in an array
     *
     * @param control Managed Object runtime controll
     * @param name Aggregation name
     * @returns Array of control aggregations
     */
    public static getControlAggregationByName(
        control: ManagedObject & { __calledJSONKeys?: boolean; [key: string]: any },
        name: string
    ) {
        let result = [];
        const aggregation = (control ? control.getMetadata().getAllAggregations() : {})[name] as unknown as object & {
            _sGetter: string;
        };

        if (aggregation) {
            if (!aggregation._sGetter && !control.__calledJSONKeys) {
                (control.getMetadata() as any).getJSONKeys();
                // Performance optimization
                control.__calledJSONKeys = true;
            }
            // This executes a _sGetter function that can vary from control to control (_sGetter can be: getContent, getItems, etc)
            result = (aggregation._sGetter && control[aggregation._sGetter]()) || [];

            // The aggregation has primitive alternative type
            if (typeof result !== 'object') {
                result = [];
            }
            result = Array.isArray(result) ? result : [result];
        }
        return result;
    }

    /**
     * Checks for property validity for analyzing
     *
     * @param {MetadataOptionsProperty} property Metadat options property
     * @returns {boolean} Whether property is valid
     */
    private static checkPropertyValidity(property: MetadataOptionsProperty): boolean {
        if (!property) {
            return false;
        }

        const propertyType = property.getType();
        if (!propertyType) {
            return false;
        }

        const typeName = propertyType.getName();
        if (!typeName) {
            return false;
        }

        return true;
    }

    /**
     * Sets properties for analyzedType when data type is enum
     *
     * @param propertyDataType Type of property data type
     * @param propertyDataType.getName Gets the name of the property
     * @param typeName Type name
     */
    private static setAnalyzedTypeForEnumDataType(propertyDataType: { getName: () => string }, typeName: string): void {
        const name = propertyDataType.getName();
        if (!name) {
            this.analyzedType.primitiveType = 'enum';
        } else {
            this.analyzedType.primitiveType = name;
        }
        this.analyzedType.ui5Type = typeName;

        // Determine base type for SAP types
        if (this.analyzedType.primitiveType === 'enum') {
            // jQuery needs to be removed because it will be likely gone in UI5 2.0
            this.analyzedType.enumValues = jQuery.sap.getObject(this.analyzedType.ui5Type);
        }
    }

    /**
     * Analyzes propery type
     *
     * @param property Managed Objects metadata properties
     * @returns {AnalyzedType | undefined} Analyzed type
     */
    private static analyzePropertyType(property: MetadataOptionsProperty): AnalyzedType | undefined {
        this.analyzedType = {
            primitiveType: 'any',
            ui5Type: null,
            enumValues: null,
            isArray: false
        };

        if (!this.checkPropertyValidity(property)) {
            return;
        }

        const typeName = property.getType().getName();

        // Check if array and determine property type (or component type)
        if (typeName.indexOf('[]') > 0) {
            this.analyzedType.primitiveType = typeName.substring(0, typeName.indexOf('[]'));
            this.analyzedType.isArray = true;
        }
        // Return if object or void type
        else if (typeName === 'void' || typeName === 'object') {
            this.analyzedType.primitiveType = typeName;
        } else if (typeName === 'any') {
            this.analyzedType.primitiveType = 'any';
        }
        // Type of control property is an elementary simple type
        else if (typeName === 'boolean' || typeName === 'string' || typeName === 'int' || typeName === 'float') {
            this.analyzedType.primitiveType = typeName;
        }
        // Control type is a sap.ui.base.DataType or an enumeration type
        else {
            // Determine type from iFrame
            const propertyDataType = DataType.getType(typeName);

            // type which is not a DataType such as Control is not supported
            if (propertyDataType && !(propertyDataType instanceof DataType)) {
                return this.analyzedType;
            }

            if (!propertyDataType) {
                return this.analyzedType;
            }

            this.setAnalyzedTypeForEnumDataType(propertyDataType, typeName);
        }

        return this.analyzedType;
    }

    /**
     * Checks if property in analyzed type is enabled
     *
     * @param analyzedType Analyzed type
     * @returns {boolean} Boolean value
     */
    private static isPropertyEnabled(analyzedType: AnalyzedType): boolean {
        return analyzedType.isArray || analyzedType.primitiveType === 'any';
    }

    /**
     * Normalizes rawValue
     *
     * @param rawValue Any object or string value
     * @returns {object | string} Object or a string
     */
    private static normalizeObjectPropertyValue(rawValue: object | string): object | string {
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
                    // (BCP: 1780025011)
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

    /**
     * Tests icon pattern
     *
     * @param name Icon name
     * @returns {boolean} Boolean value
     */
    private static testIconPattern(name: string): boolean {
        // replace `/src|.*icon$|^icon.*/i`.test(property.name);
        // match 'src' or any string starting or ending with 'icon' (case insensitive;)
        const nameLc = (name || '').toLowerCase();
        return nameLc.indexOf('src') >= 0 || nameLc.startsWith('icon') || nameLc.endsWith('icon');
    }

    /**
     * Converts strings from camel case to pascal case
     *
     * @param text Text to convert
     * @returns {boolean} Boolean value
     */
    private static convertCamelCaseToPascalCase = (text: string): string => {
        const string = text.replace(/([A-Z])/g, ' $1');
        return string.charAt(0).toUpperCase() + string.slice(1);
    };

    /**
     * Builds control data
     *
     * @param control Control Managed Object
     * @param controlOverlay Control overlay
     * @param _includeDocumentation Toggle whether to include documentation
     * @returns {BuiltRuntimeControl} Built runtime control
     */
    public static async buildControlData(
        control: ManagedObject,
        controlOverlay?: ElementOverlay,
        _includeDocumentation = true
    ): Promise<BuiltRuntimeControl> {
        const controlMetadata = control.getMetadata();

        const selectedControlName = controlMetadata.getName();

        const hasStableId = Utils.checkControlId(control);

        const controlProperties = controlOverlay
            ? controlOverlay.getDesignTimeMetadata().getData().properties
            : undefined;

        // Add the control's properties
        const allProperties = controlMetadata.getAllProperties();
        const propertyNames: string[] = Object.keys(allProperties);
        const properties: Properties[] = [];
        // const document = includeDocumentation ? await getDocumentation(selectedControlName, selContLibName) : {};
        // ? Do we need this documentation at all
        const document: { [key: string]: object } = {};
        for (const propertyName of propertyNames) {
            const property = allProperties[propertyName] as MetadataOptionsProperty;

            const analyzedType = this.analyzePropertyType(property);
            if (!analyzedType) {
                continue;
            }
            // the default behavior is that the property is enabled
            // meaning it's not ignored during design time
            let ignore = false;
            if (controlProperties?.[property?.name]) {
                // check whether the property should be ignored in design time or not
                // if it's 'undefined' then it's not considered when building isEnabled because it's 'true'
                ignore = controlProperties[property.name].ignore;
            }

            // updating i18n text for the control if bindingInfo has bindingString
            const controlNewData = {
                id: control.getId(),
                name: property.name,
                newValue: control.getProperty(property.name)
            };
            const bindingInfo = control.getBindingInfo(controlNewData.name) as object & {
                bindingString?: string;
            };
            if (bindingInfo?.bindingString !== undefined) {
                controlNewData.newValue = bindingInfo.bindingString;
            }

            const documentation = document?.[property.name]
                ? document[property.name]
                : {
                      defaultValue: (property.defaultValue as string) || '-',
                      description: '',
                      propertyName: property.name,
                      type: analyzedType.ui5Type,
                      propertyType: analyzedType.ui5Type
                  };

            // A property is enabled if:
            // 1. The property supports changes
            // 2. The control has stable ID
            // 3. It is not configured to be ignored in design time
            // 4. And control overlay is selectable
            const isEnabled =
                (controlOverlay?.isSelectable() ?? false) &&
                this.isPropertyEnabled(analyzedType) &&
                hasStableId &&
                !ignore;

            this.getPropertyForBuiltControl(
                analyzedType,
                property,
                properties,
                documentation,
                selectedControlName,
                controlNewData,
                isEnabled
            );
        }

        properties.sort((a, b) => (a.name > b.name ? 1 : -1));

        return {
            id: control.getId(), // the id of the underlying control/aggregation
            type: selectedControlName, // the name of the ui5 class of the control/aggregation
            properties, // sorted array of properties
            name: selectedControlName
        };
    }

    /**
     * Pushed property to properties array depending on primitiveType of analyzed T
     *
     * @param {AnalyzedType} analyzedType  Analyzed type
     * @param {MetadataOptionsProperty} property Property
     * @param {Properties[]} properties Properties array
     * @param documentation Documentation object
     * @param selectedControlName Selected control name
     * @param {ControlNewData} controlNewData Control new data
     * @param isEnabled Whether property is enabled
     */
    private static getPropertyForBuiltControl(
        analyzedType: AnalyzedType,
        property: MetadataOptionsProperty,
        properties: Properties[],
        documentation: object,
        selectedControlName: string,
        controlNewData: ControlNewData,
        isEnabled: boolean
    ) {
        const value = this.normalizeObjectPropertyValue(controlNewData.newValue);
        const isIcon =
            this.testIconPattern(property.name) &&
            selectedControlName !== 'sap.m.Image' &&
            analyzedType.ui5Type === 'sap.ui.core.URI';

        const readableName = this.convertCamelCaseToPascalCase(property.name);

        switch (analyzedType.primitiveType) {
            case 'enum': {
                const values = analyzedType.enumValues ?? {};
                const options: { key: string; text: string }[] = Object.keys(values).map((key) => ({
                    key,
                    text: values[key]
                }));
                properties.push({
                    type: 'string',
                    editor: 'dropdown',
                    name: property.name,
                    readableName,
                    value,
                    isEnabled,
                    options,
                    documentation
                });
                break;
            }
            case 'string': {
                properties.push({
                    type: 'string',
                    editor: 'input',
                    name: property.name,
                    readableName,
                    value,
                    isEnabled,
                    isIcon,
                    documentation: documentation
                });
                break;
            }
            case 'int': {
                properties.push({
                    type: 'integer',
                    editor: 'input',
                    name: property.name,
                    readableName,
                    value: value as unknown as number,
                    isEnabled,
                    documentation
                });
                break;
            }
            case 'float': {
                properties.push({
                    type: 'float',
                    editor: 'input',
                    name: property.name,
                    readableName,
                    value: value as unknown as number,
                    isEnabled,
                    documentation
                });
                break;
            }
            case 'boolean': {
                properties.push({
                    type: 'boolean',
                    editor: 'checkbox',
                    name: property.name,
                    readableName,
                    value: value as unknown as boolean,
                    isEnabled,
                    documentation
                });
                break;
            }
            default:
                break;
        }
    }
}

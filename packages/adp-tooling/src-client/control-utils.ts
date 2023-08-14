export default class ControlUtils {
    public static getRuntimeControl(overlayControl: sap.ui.dt.ElementOverlay): sap.ui.base.ManagedObject {
        let runtimeControl;
        if (overlayControl.getElementInstance) {
            runtimeControl = overlayControl.getElementInstance();
        } else {
            runtimeControl = overlayControl.getElement();
        }
        return runtimeControl;
    }

    public static getControlAggregationByName(oControl: any, sName: string) {
        var aResult = [],
            oAggregation = ((oControl && oControl.getMetadata().getAllAggregations()) || {})[sName];

        if (oAggregation) {
            if (!oAggregation._sGetter && !oControl.__calledJSONKeys) {
                oControl.getMetadata().getJSONKeys();
                // Performance optimization
                oControl.__calledJSONKeys = true;
            }

            aResult = (oAggregation._sGetter && oControl[oAggregation._sGetter]()) || [];

            //the aggregation has primitive alternative type
            if (typeof aResult !== 'object') {
                aResult = [];
            }
            aResult = aResult.splice ? aResult : [aResult];
        }
        return aResult;
    }

    private static analyzePropertyType(property: sap.ui.base.ManagedObjectMetadataProperties): any | undefined {
        const analyzedType = {
            primitiveType: 'any',
            ui5Type: null,
            enumValues: null,
            isArray: false
        };

        if (!property) {
            return;
        }

        const propertyType = property.getType();
        if (!propertyType) {
            return;
        }

        const typeName = propertyType.getName();
        if (!typeName) {
            return;
        }

        // Check if array and determine property type (or component type)
        if (typeName.indexOf('[]') > 0) {
            analyzedType.primitiveType = typeName.substring(0, typeName.indexOf('[]'));
            analyzedType.isArray = true;
        }
        // Return if object or void type
        else if (typeName === 'void' || typeName === 'object') {
            analyzedType.primitiveType = typeName;
        } else if (typeName === 'any') {
            analyzedType.primitiveType = 'any';
        }
        // Type of control property is an elementary simple type
        else if (typeName === 'boolean' || typeName === 'string' || typeName === 'int' || typeName === 'float') {
            analyzedType.primitiveType = typeName;
        }
        // Control type is a sap.ui.base.DataType or an enumeration type
        else {
            // Determine type from iFrame
            // @ts-ignore
            const DataType = window.sap.ui.base.DataType;
            const propertyDataType = DataType.getType(typeName);

            //type which is not a DataType such as Control is not supported
            if (propertyDataType && !(propertyDataType instanceof DataType)) {
                return analyzedType;
            }
            const name = Object.getPrototypeOf(propertyDataType).getName();
            if (!name) {
                analyzedType.primitiveType = 'enum';
            } else {
                analyzedType.primitiveType = name;
            }
            analyzedType.ui5Type = typeName;

            // Determine base type for SAP types
            if (analyzedType.primitiveType === 'enum') {
                // @ts-ignore
                analyzedType.enumValues = jQuery.sap.getObject(analyzedType.ui5Type);
            }
        }

        return analyzedType;
    }

    private static isPropertyEnabled(analyzedType: any): boolean {
        return analyzedType.isArray || analyzedType.primitiveType === 'any' ? false : true;
    }

    private static normalizeObjectPropertyValue(rawValue: any): string {
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

    private static testIconPattern(name: string): boolean {
        // replace `/src|.*icon$|^icon.*/i`.test(property.name);
        // match 'src' or any string starting or ending with 'icon' (case insensitive;)
        const nameLc = (name || '').toLowerCase();
        return nameLc.indexOf('src') >= 0 || nameLc.startsWith('icon') || nameLc.endsWith('icon');
    }

    private static convertCamelCaseToPascalCase = (text: string): string => {
        const string = text.replace(/([A-Z])/g, ' $1');
        return string.charAt(0).toUpperCase() + string.slice(1);
    };

    public static async buildControlData(
        // @ts-ignore
        control: sap.ui.base.ManagedObject,
        controlOverlay?: sap.ui.dt.ElementOverlay,
        includeDocumentation = true
    ): Promise<any> {
        const controlMetadata = control.getMetadata();

        const selectedControlName = controlMetadata.getName();
        const selContLibName = controlMetadata.getLibraryName();

        const hasStableId = sap.ui.fl.Utils.checkControlId(control);

        const controlProperties = controlOverlay
            ? controlOverlay.getDesignTimeMetadata().getData().properties
            : undefined;

        // Add the control's properties
        const allProperties = controlMetadata.getAllProperties() as unknown as {
            [name: string]: sap.ui.base.ManagedObjectMetadataProperties;
        };
        const propertyNames = Object.keys(allProperties);
        const properties = [];
        // const document = includeDocumentation ? await getDocumentation(selectedControlName, selContLibName) : {};
        const document: any = {};
        for (const propertyName of propertyNames) {
            const property: any = allProperties[propertyName];

            const analyzedType = this.analyzePropertyType(property);
            if (!analyzedType) {
                continue;
            }
            // the default behavior is that the property is enabled
            // meaning it's not ignored during design time
            let ignore = false;
            if (controlProperties && controlProperties[property.name]) {
                // check whether the property should be ignored in design time or not
                // if it's 'undefined' then it's not considered when building isEnabled because it's 'true'
                ignore = controlProperties[property.name].ignore;
            }

            //updating i18n text for the control if bindingInfo has bindingString
            const controlNewData = {
                id: control.getId(),
                name: property.name,
                newValue: control.getProperty(property.name)
            };
            const bindingInfo: { bindingString?: string } = control.getBindingInfo(controlNewData.name);
            if (bindingInfo?.bindingString !== undefined) {
                controlNewData.newValue = bindingInfo.bindingString;
            }

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
            const value = this.normalizeObjectPropertyValue(controlNewData.newValue);
            const isIcon =
                this.testIconPattern(property.name) &&
                selectedControlName !== 'sap.m.Image' &&
                analyzedType.ui5Type === 'sap.ui.core.URI';
            const documentation =
                document && document[property.name]
                    ? document[property.name]
                    : {
                          defaultValue: (property.defaultValue as string) || '-',
                          description: '',
                          propertyName: property.name,
                          type: analyzedType.ui5Type,
                          propertyType: analyzedType.ui5Type
                      };
            const readableName = this.convertCamelCaseToPascalCase(property.name);
            switch (analyzedType.primitiveType) {
                case 'enum': {
                    const values = analyzedType.enumValues ?? {};
                    const options: { key: string; text: string }[] = Object.keys(values).map((key) => ({
                        key,
                        text: values[key]
                    }));
                    // @ts-ignore
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
                    // @ts-ignore
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
                    // @ts-ignore
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
                    // @ts-ignore
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
                    // @ts-ignore
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
            }
        }

        return {
            id: control.getId(), //the id of the underlying control/aggregation
            type: selectedControlName, //the name of the ui5 class of the control/aggregation
            // @ts-ignore
            properties: properties.sort((a, b) => (a.name > b.name ? 1 : -1)),
            name: selectedControlName
        };
    }
}

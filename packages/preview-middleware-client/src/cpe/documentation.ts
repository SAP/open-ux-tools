import { getLibrary } from './utils';
import type { SchemaForApiJsonFiles, Ui5Metadata, Ui5Property } from './api-json';
import type { Properties } from './utils';
import Log from 'sap/base/Log';
import { PropertiesInfo } from '@sap-ux-private/control-property-editor-common';

export interface ControlMetadata {
    baseType: string | undefined;
    doc: string;
    properties: Properties;
}

/**
 * Get ui5 metadata of given library name.
 *
 * @param libName library name for eg: sap.m
 * @returns Promise<SchemaForApiJsonFiles>
 */
export async function getUi5ApiDtMetadata(libName: string): Promise<SchemaForApiJsonFiles> {
    const libUrl = '/test-resources/' + libName.split('.').join('/') + '/designtime/api.json';
    return fetch(libUrl).then((res) => res.json() as unknown as SchemaForApiJsonFiles);
}

/**
 * load ui5 controls design time metadata api.json for following libraries
 * sap.m, sap.ui.comp, sap.f, sap.ui.core
 * loading libraries(more in file size) in parallel during initialization.
 * Others (less in file size) are loaded dynamically in getControlMetadata method
 */
const ui5ApiDtMetadata: Map<string, SchemaForApiJsonFiles> = new Map();
export function loadDefaultLibraries(): void {
    const allData = Promise.all([
        getUi5ApiDtMetadata('sap.m'),
        getUi5ApiDtMetadata('sap.ui.comp'),
        getUi5ApiDtMetadata('sap.ui.core'),
        getUi5ApiDtMetadata('sap.f')
    ]);
    allData
        .then((res) => {
            res.forEach((api: SchemaForApiJsonFiles) => {
                if (api.library) {
                    ui5ApiDtMetadata.set(api.library, api);
                }
            });
        })
        .catch((reason) => Log.error('Loading Library Failed: ' + reason));
}

/**
 * Format html text.
 *
 * @param sHtml - html string
 * @returns string
 */
function formatHtmlText(sHtml: string): string {
    // replaced "sHtml.replace(new RegExp('<[^>]*>', 'g')" due to regex runtime vulnerability
    const parts = (sHtml || '').split('<');
    let result = '';
    for (const part of parts) {
        if (!result) {
            result = part;
        } else {
            const indexClosingBracket = part.indexOf('>');
            result += indexClosingBracket >= 0 ? part.substring(indexClosingBracket + 1) : `<${part}`;
        }
    }
    return result;
}

/**
 * Method to parse ui5 control metadata.
 *
 * @param controlLibMetadata control library metadata
 * @param controlName name of the control
 * @returns ControlMetadata
 */
function parseControlMetaModel(controlLibMetadata: SchemaForApiJsonFiles, controlName: string): ControlMetadata {
    const controlInfo: ControlMetadata = {
        baseType: '',
        doc: '',
        properties: {}
    };
    const selectedControlMetadata = (controlLibMetadata.symbols ?? []).find((control) => control.name === controlName);
    if (selectedControlMetadata) {
        // base type info of control is available on property 'extends'
        controlInfo.baseType = selectedControlMetadata.extends as string | undefined;
        controlInfo.doc = selectedControlMetadata.description ?? '';
        const properties: (Ui5Property & PropertiesInfo)[] | undefined = (
            selectedControlMetadata['ui5-metadata'] as Ui5Metadata
        ).properties as (Ui5Property & PropertiesInfo)[] | undefined;
        if (properties) {
            properties.forEach((prop: Ui5Property & PropertiesInfo) => {
                prop.description = formatHtmlText(prop.description || '');
                prop.propertyName = prop.name;
                prop.propertyType = prop.type;
                if (prop.defaultValue === null || prop.defaultValue === '') {
                    prop.defaultValue = '-';
                }
                controlInfo.properties[prop.name] = { ...prop };
            });
        }
    }
    return controlInfo;
}

/**
 * Get control metadata for a given control.
 *
 * @param controlName name of the control
 * @param contLibName library name of the control
 * @returns Promise<ControlMetadata | undefined>
 */
async function getControlMetadata(controlName: string, contLibName: string): Promise<ControlMetadata | undefined> {
    let result: ControlMetadata | undefined;
    let controlLibMetadata = ui5ApiDtMetadata.get(contLibName);
    if (controlLibMetadata) {
        result = parseControlMetaModel(controlLibMetadata, controlName);
    } else {
        controlLibMetadata = await getUi5ApiDtMetadata(contLibName);
        ui5ApiDtMetadata.set(contLibName, controlLibMetadata);
        result = parseControlMetaModel(controlLibMetadata, controlName);
    }
    return result;
}

/**
 * Get Control Property Documentation for a give control name and control library.
 *
 * @param controlName name of the control
 * @param contLibName library name of the control
 * @returns Promise<Properties | undefined>
 */
async function getControlPropertyDocumentation(
    controlName: string,
    contLibName: string
): Promise<Properties | undefined> {
    const doc = await getControlMetadata(controlName, contLibName);
    if (doc) {
        const baseControlType = doc.baseType;
        if (baseControlType) {
            const baseContLibName = await getLibrary(baseControlType);
            if (baseContLibName) {
                const baseControlProps = await getControlPropertyDocumentation(baseControlType, baseContLibName);
                return { ...baseControlProps, ...doc.properties };
            }
        }
        return { ...doc.properties };
    } else {
        return undefined;
    }
}

/**
 * Get documentation of a given control of a ui5 library.
 *
 * @param controlName name of the control.
 * @param contLibName library name of the control
 * @returns Promise<Properties | undefined>
 */
export async function getDocumentation(controlName: string, contLibName: string): Promise<Properties | undefined> {
    let doc: Properties | undefined;
    try {
        doc = await getControlPropertyDocumentation(controlName, contLibName);
    } catch (err) {
        Log.error(`Error in getting documentation for ${contLibName}`);
    }
    return doc;
}

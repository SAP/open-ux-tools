import { getLibrary } from './utils';
import type { SchemaForApiJsonFiles } from './apiJson';
import type { Properties } from './utils';
export interface ControlMetadata {
    baseType: string | undefined;
    doc: string;
    properties: Properties;
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
        .catch((reason) => console.error(reason));
}

/**
 * Get ui5 metadata of given library name.
 *
 * @param libName library name for eg: sap.m
 * @returns Promise<SchemaForApiJsonFiles>
 */
export async function getUi5ApiDtMetadata(libName: string): Promise<SchemaForApiJsonFiles> {
    const libUrl = '/test-resources/' + libName.split('.').join('/') + '/designtime/api.json';
    return fetch(libUrl).then((res) => res.json());
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
        doc = await getControlPropertyDocumentation(controlName, contLibName, ui5ApiDtMetadata);
    } catch (err) {
        console.error(`Error in getting documentation for ${contLibName}`);
    }
    return doc;
}

/**
 * Get Control Property Documentation for a give control name and control library.
 *
 * @param controlName name of the control
 * @param contLibName library name of the control
 * @param ui5ApiDtMetadata ui5 api metadata
 * @returns Promise<Properties | undefined>
 */
export async function getControlPropertyDocumentation(
    controlName: string,
    contLibName: string,
    ui5ApiDtMetadata: Map<string, SchemaForApiJsonFiles>
): Promise<Properties | undefined> {
    const doc = await getControlMetadata(controlName, contLibName, ui5ApiDtMetadata);
    if (doc) {
        const baseControlType = doc.baseType;
        if (baseControlType) {
            contLibName = await getLibrary(baseControlType);
            if (contLibName) {
                const baseControlProps = await getControlPropertyDocumentation(
                    baseControlType,
                    contLibName,
                    ui5ApiDtMetadata
                );
                return { ...baseControlProps, ...doc.properties };
            }
        }
        return { ...doc.properties };
    } else {
        return undefined;
    }
}

/**
 * Get control metadata for a given control.
 *
 * @param controlName name of the control
 * @param contLibName library name of the control
 * @param ui5ApiDtMetadata ui5 api metadata
 * @returns Promise<ControlMetadata | undefined>
 */
async function getControlMetadata(
    controlName: string,
    contLibName: string,
    ui5ApiDtMetadata: Map<string, SchemaForApiJsonFiles>
): Promise<ControlMetadata | undefined> {
    let result: ControlMetadata | undefined;
    const controlLibMetadata = ui5ApiDtMetadata.get(contLibName);
    if (controlLibMetadata) {
        result = parseControlMetaModel(controlLibMetadata, controlName);
    } else {
        const controlLibMetadata: SchemaForApiJsonFiles = await getUi5ApiDtMetadata(contLibName);
        ui5ApiDtMetadata.set(contLibName, controlLibMetadata);
        result = parseControlMetaModel(controlLibMetadata, controlName);
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
        controlInfo.baseType = selectedControlMetadata.extends;
        controlInfo.doc = selectedControlMetadata.description ?? '';
        const properties = selectedControlMetadata['ui5-metadata'].properties;
        if (properties) {
            properties.forEach((prop: any) => {
                prop.description = formatHtmlText(prop.description) || '';
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

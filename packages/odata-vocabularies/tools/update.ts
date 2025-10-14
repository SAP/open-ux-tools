/* eslint-disable no-console */ // Only intend to run in CLI environment where we don't need more advanced logging
import path from 'node:path';
import fs from 'fs/promises';
import axios from 'axios';
import prettier from 'prettier';
import type { CSDL, CSDLAnnotations, SchemaElement } from '@sap-ux/vocabularies/CSDL';

export interface SupportedVocabularies {
    [key: string]: VocabularyConfig;
}

export interface VocabularyConfig {
    uri: string;
    update?: boolean;
}
export const SUPPORTED_VOCABULARIES: SupportedVocabularies = {
    'Org.OData.Aggregation.V1': {
        uri: 'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Aggregation.V1.json'
    },
    'com.sap.vocabularies.Analytics.v1': {
        uri: 'https://sap.github.io/odata-vocabularies/vocabularies/Analytics.json'
    },
    'Org.OData.Authorization.V1': {
        uri: 'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Authorization.V1.json'
    },
    'Org.OData.Capabilities.V1': {
        uri: 'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Capabilities.V1.json'
    },
    'com.sap.vocabularies.CDS.v1': {
        uri: 'https://sap.github.io/odata-vocabularies/vocabularies/CDS.json',
        update: false
    },
    'com.sap.vocabularies.CodeList.v1': {
        uri: 'https://sap.github.io/odata-vocabularies/vocabularies/CodeList.json'
    },
    'com.sap.vocabularies.Common.v1': {
        uri: 'https://sap.github.io/odata-vocabularies/vocabularies/Common.json'
    },
    'com.sap.vocabularies.Communication.v1': {
        uri: 'https://sap.github.io/odata-vocabularies/vocabularies/Communication.json'
    },
    'com.sap.vocabularies.DataIntegration.v1': {
        uri: 'https://sap.github.io/odata-vocabularies/vocabularies/DataIntegration.json'
    },
    'com.sap.vocabularies.DirectEdit.v1': {
        uri: 'https://sap.github.io/odata-vocabularies/vocabularies/DirectEdit.json'
    },
    'Org.OData.Core.V1': {
        uri: 'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Core.V1.json'
    },
    'com.sap.vocabularies.Graph.v1': {
        uri: 'https://sap.github.io/odata-vocabularies/vocabularies/Graph.json'
    },
    'com.sap.vocabularies.Hierarchy.v1': {
        uri: 'https://sap.github.io/odata-vocabularies/vocabularies/Hierarchy.json'
    },
    'com.sap.vocabularies.HTML5.v1': {
        uri: 'https://sap.github.io/odata-vocabularies/vocabularies/HTML5.json'
    },
    'Org.OData.JSON.V1': {
        uri: 'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.JSON.V1.json'
    },
    'Org.OData.Measures.V1': {
        uri: 'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Measures.V1.json'
    },
    'com.sap.vocabularies.ODM.v1': {
        uri: 'https://sap.github.io/odata-vocabularies/vocabularies/ODM.json'
    },
    'com.sap.vocabularies.PDF.v1': {
        uri: 'https://sap.github.io/odata-vocabularies/vocabularies/PDF.json'
    },
    'com.sap.vocabularies.PersonalData.v1': {
        uri: 'https://sap.github.io/odata-vocabularies/vocabularies/PersonalData.json'
    },
    'com.sap.vocabularies.Session.v1': {
        uri: 'https://sap.github.io/odata-vocabularies/vocabularies/Session.json'
    },
    'Org.OData.Repeatability.V1': {
        uri: 'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Repeatability.V1.json'
    },
    'Org.OData.Temporal.V1': {
        uri: 'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Temporal.V1.json'
    },
    'com.sap.vocabularies.UI.v1': {
        uri: 'https://sap.github.io/odata-vocabularies/vocabularies/UI.json'
    },
    'Org.OData.Validation.V1': {
        uri: 'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Validation.V1.json'
    }
};

export const VOCABULARIES_LOCATION = path.join('src', 'resources');

/**
 *
 * @param url - A string containing the URL to which the request is sent
 * @public
 * @returns - Returns vocabulary content
 */
export async function getVocabulary(url: string): Promise<CSDL> {
    const response = await axios.get<CSDL>(url, { responseType: 'json' });
    return response.data;
}

const updateVocabulary = async (namespace: string, config: VocabularyConfig, date: Date): Promise<void> => {
    // fetch vocabulary content

    if (config.update === false) {
        return;
    }
    const file = path.join(VOCABULARIES_LOCATION, `${namespace}.ts`);
    const content = await getVocabulary(config.uri);

    // uglify
    const contentUglified = uglify(content);

    // stringify
    const contentStringified = JSON.stringify(contentUglified, null, 4);
    const contentFile = [
        `// Last content update: ${date}`,
        `import type { CSDL } from '@sap-ux/vocabularies/CSDL';`,
        '',
        `export default ${contentStringified} as CSDL;`
    ].join('\n');

    // prettify
    const options = await prettier.resolveConfig(file);
    if (options === null) {
        console.error('Could not resolve prettier config.');
        return;
    }
    options.parser = 'typescript';
    const filePrettified = prettier.format(contentFile, options);

    await fs.writeFile(file, filePrettified, 'utf8');

    console.log(`Vocabulary file updated: ${namespace}`);
};

/**
 * Updates vocabulary resources in project.
 *
 * Vocabulary data is uglified (alias -> namespace) to remove complexity for further processing.
 *
 * @public
 */
export async function updateVocabularies(): Promise<void> {
    const date = new Date();
    const vocabularies: any = Object.assign(SUPPORTED_VOCABULARIES);

    try {
        await fs.mkdir(VOCABULARIES_LOCATION);
    } catch (error) {
        if (error.code !== 'EEXIST') {
            return;
        }
    }

    const promises = Object.keys(vocabularies).map((namespace) =>
        updateVocabulary(namespace, vocabularies[namespace], date)
    );
    await Promise.all(promises);
}

/**
 *
 * @param vocabulary - Vocabulary (JSON CSDL data)
 * @private
 * @returns Returns mapping: alias -> namespace
 */
export function getNamespaceAliasMapping(vocabulary: CSDL): Record<string, string> {
    const mapping: Record<string, string> = {
        Edm: 'Edm',
        odata: 'odata'
    };

    const references = Object.keys(vocabulary.$Reference ?? {});

    // collect reference mappings
    for (const url of references) {
        const reference = vocabulary.$Reference?.[url];
        const includes = reference?.$Include ?? [];
        for (const include of includes) {
            const alias = include.$Alias;
            if (alias) {
                mapping[alias] = include.$Namespace;
            }
        }
    }

    const namespace = Object.keys(vocabulary).find((key) => !key.startsWith('$'));
    if (!namespace) {
        return mapping;
    }
    const schema = vocabulary[namespace];
    if (!schema) {
        return mapping;
    }
    if (schema.$Alias) {
        mapping[schema.$Alias] = namespace;
    }

    return mapping;
}

/**
 *
 * @param value                 - Value
 * @param namespaceAliasMapping - Mapping: alias->namespace
 * @private
 * @returns  Substitute aliases by namespaces in value
 */
export function convertValue(value: any, namespaceAliasMapping: Record<string, string>): any {
    if (typeof value === 'string') {
        for (const alias in namespaceAliasMapping) {
            if (value.startsWith(`${alias}.`)) {
                value = value.replace(alias, namespaceAliasMapping[alias]);
            }
        }
    } else if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
            value[i] = convertValue(value[i], namespaceAliasMapping);
        }
    }

    return value;
}

/**
 *
 * @param name                  - Alias qualified name (or full qualified name)
 * @param namespaceAliasMapping - Mapping: alias->namespace
 * @private
 * @returns Returns the fully qualified name
 */
export function getFullyQualifiedName(name: string, namespaceAliasMapping: Record<string, string>): string {
    let result: string = '';

    if (typeof name === 'string') {
        const segments = name.split('.');
        if (segments.length === 2) {
            const alias = segments[0];
            const base = segments[1];
            result = `${namespaceAliasMapping[alias]}.${base}`;
        } else if (segments.length > 2) {
            result = name;
        }
    } else {
        console.warn(name);
    }

    return result;
}

/**
 *
 * @param key                   - Object key
 * @param namespaceAliasMapping - Mapping: alias->namespace
 * @private
 * @returns Substitute aliases by namespaces in key
 */
export function convertKey(key: string, namespaceAliasMapping: Record<string, string>): string {
    const [nonAnnotationSegment, ...segments] = key.split('@');
    for (let i = 0; i < segments.length; i++) {
        segments[i] = getFullyQualifiedName(segments[i], namespaceAliasMapping);
    }
    return [nonAnnotationSegment, ...segments].join('@');
}

/**
 *
 * @param  object  - Object containing a key to be renamed
 * @param  name    - Name of the key to be renamed
 * @param  newName - New name of the key
 * @private
 * @returns Rename a single key of an object preserving the key sequence
 */
export function renameKey(object: any, name: string, newName: string): any {
    const newObject: any = {};

    for (const key of Object.keys(object)) {
        if (key === name) {
            newObject[newName] = object[key];
        } else {
            newObject[key] = object[key];
        }
    }

    return newObject;
}

/**
 *
 * @param object                - CSDL JSON data
 * @param namespaceAliasMapping - Mapping: alias->namespace
 * @private
 * @returns  Substitute aliases by namespaces (Aliases are kept in references and descriptions)
 */
export function uglifyAnnotations(object: CSDLAnnotations, namespaceAliasMapping: Record<string, string>): any {
    for (const key in object) {
        const newKey = getFullyQualifiedName(key, namespaceAliasMapping);
        object = renameKey(object, key, newKey);
    }

    return object;
}

/**
 * Substitute aliases by namespaces.
 *
 * (Aliases are kept in references and descriptions).
 *
 * @param object                - CSDL JSON data
 * @param namespaceAliasMapping - Mapping: alias->namespace
 * @private
 * @returns SchemaElement
 */
export function uglify(
    object: SchemaElement | CSDL,
    namespaceAliasMapping?: Record<string, string>
): SchemaElement | CSDL {
    if (typeof object !== 'object') {
        return object;
    }

    if (namespaceAliasMapping === undefined) {
        namespaceAliasMapping = getNamespaceAliasMapping(object);
    }

    for (const originalKey in object) {
        if (!object.hasOwnProperty(originalKey)) {
            continue;
        }
        const propertyValue = object[originalKey];
        let key = originalKey;
        if (['$Type', '$BaseTerm', '$BaseType', '@type'].includes(key)) {
            object[key] = convertValue(propertyValue, namespaceAliasMapping);
        } else if (key.indexOf('@') >= 0) {
            const newKey = convertKey(key, namespaceAliasMapping);
            object = renameKey(object, key, newKey);
            key = newKey;

            if (
                !key.endsWith('@Org.OData.Core.V1.Description') &&
                !key.endsWith('@Org.OData.Core.V1.LongDescription')
            ) {
                object[key] = convertValue(propertyValue, namespaceAliasMapping);
            }
        }

        if (key === '$Annotations') {
            object[key] = uglifyAnnotations(propertyValue, namespaceAliasMapping);
        }

        object[key] = uglify(object[key], namespaceAliasMapping);
    }

    return object;
}

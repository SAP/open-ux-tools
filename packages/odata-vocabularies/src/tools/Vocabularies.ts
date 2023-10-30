import path from 'path';
import mkdirp from 'mkdirp';
import fs from 'fs';
import fetch from 'node-fetch';
import prettier from 'prettier';
interface SupportedVocabularies {
    [key: string]: {
        uri: string;
        update?: boolean;
    };
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
 * @returns {string} - Returns vocabulary content
 */
export async function getVocabulary(url: string): Promise<string> {
    const response = await fetch(url);
    return response.json();
}

/**
 * Updates vocabulary resources in project.
 *
 * Vocabulary data is uglified (alias -> namespace) to remove complexity for further processing.
 *
 * @public
 * @returns
 */
export async function updateVocabularies(): Promise<any> {
    const date = new Date();
    const vocabularies: any = Object.assign(SUPPORTED_VOCABULARIES);

    mkdirp.sync(VOCABULARIES_LOCATION);
    for (const namespace in vocabularies) {
        // fetch vocabulary content
        const vocabulary = vocabularies[namespace];
        if (vocabulary.update === false) {
            continue;
        }
        vocabulary.file = path.join(VOCABULARIES_LOCATION, `${namespace}.ts`);
        vocabulary.content = await getVocabulary(vocabulary.uri);

        // uglify
        const contentUglified = uglify(vocabulary.content);

        // stringify
        const contentStringified = JSON.stringify(contentUglified, null, 4);
        const contentFile = `// Last content update: ${date}\n\nexport default ${contentStringified}`;

        // prettify
        const options = await prettier.resolveConfig(vocabulary.file);
        options.parser = 'typescript';
        vocabulary.filePrettified = prettier.format(contentFile, options);

        // write to file system
        fs.writeFileSync(vocabulary.file, vocabulary.filePrettified, 'utf8');

        // log
        console.log(`Vocabulary file updated: ${namespace}`);
    }

    return vocabularies;
}

/**
 *
 * @param vocabulary - Vocabulary (JSON CSDL data)
 * @private
 * @returns {object} Returns mapping: alias -> namespace
 */
export function getNamespaceAliasMapping(vocabulary): any {
    const namespace = {};

    namespace['Edm'] = 'Edm';
    namespace['odata'] = 'odata';

    for (const propertyName in vocabulary) {
        const property = vocabulary[propertyName];

        if (propertyName === '$Reference') {
            // references
            for (const url in property) {
                const reference = property[url]['$Include'][0];
                namespace[reference.$Alias] = reference.$Namespace;
            }
        } else if (!propertyName.startsWith('$')) {
            // schema
            namespace[property.$Alias] = propertyName;
        }
    }

    return namespace;
}

/**
 *
 * @param value                 - Value
 * @param namespaceAliasMapping - Mapping: alias->namespace
 * @private
 * @returns  Substitute aliases by namespaces in value
 */
export function convertValue(value: any, namespaceAliasMapping: any): any {
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
 * @param {string} name                  - Alias qualified name (or full qualified name)
 * @param {object} namespaceAliasMapping - Mapping: alias->namespace
 * @private
 * @returns {string} Returns the fully qualified name
 */
export function getFullyQualifiedName(name: string, namespaceAliasMapping: any): string {
    let result: string;

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
export function convertKey(key: string, namespaceAliasMapping: any): any {
    const [nonAnnotationSegment, ...segments] = key.split('@');
    for (let i = 0; i < segments.length; i++) {
        segments[i] = getFullyQualifiedName(segments[i], namespaceAliasMapping);
    }
    return [nonAnnotationSegment, ...segments].join('@');
}

/**
 *
 * @param {object} object  - Object containing a key to be renamed
 * @param {string} name    - Name of the key to be renamed
 * @param {string} newName - New name of the key
 * @private
 * @returns Rename a single key of an object preserving the key sequence
 */
export function renameKey(object: any, name: string, newName: string): any {
    const newObject = {};

    Object.keys(object).forEach((key) => {
        const value = object[key];

        if (key === name) {
            newObject[newName] = value;
        } else {
            newObject[key] = value;
        }
    });

    return newObject;
}

/**
 *
 * @param object                - CSDL JSON data
 * @param namespaceAliasMapping - Mapping: alias->namespace
 * @private
 * @returns {object} Substitute aliases by namespaces (Aliases are kept in references and descriptions)
 */
export function uglifyAnnotations(object, namespaceAliasMapping?): any {
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
 * @returns {object}
 */
export function uglify(object, namespaceAliasMapping?): any {
    if (typeof object === 'object') {
        if (namespaceAliasMapping === undefined) {
            namespaceAliasMapping = getNamespaceAliasMapping(object);
        }

        for (let key in object) {
            const propertyValue = object[key];
            if (key === '$Type' || key === '$BaseTerm' || key === '$BaseType' || key === '@type') {
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
    }
    return object;
}

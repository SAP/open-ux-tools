import { XMLParser } from 'fast-xml-parser';
import { t } from '../i18n';
import type { NamespaceAlias, OdataService } from '../types';

/**
 * Returns the namespaces parsed from the specified metadata and annotations.
 *
 * @param {Partial<OdataService>} service - an odata service where at least metadata and annotations properties are defined
 * @param {string} service.metadata - OData service metadata xml
 * @param {string} service.annotations - OData service annotations xml
 * @returns A reference to the namspaces array
 */
export function getAnnotationNamespaces({ metadata, annotations }: Partial<OdataService>): NamespaceAlias[] {
    // Enhance service with annotations namespaces
    const schemaNamespaces = metadata ? getNamespaces(metadata) : [];

    if (annotations?.xml) {
        // Parse once
        const annotationsJson: Object = xmlToJson(annotations.xml);

        return schemaNamespaces.map((schema: NamespaceAlias) => {
            // Check if alias exists in backend annotation file, if so use it
            const annotationAlias =
                annotations.xml && schema.namespace ? getAliasFromAnnotation(annotationsJson, schema.namespace) : '';
            if (annotationAlias) {
                schema.alias = annotationAlias;
            }
            return schema;
        });
    }
    return schemaNamespaces;
}

/**
 * Convert specified xml string to JSON.
 *
 * @param xml - the schema to parse
 * @returns parsed object representation of passed XML
 */
function xmlToJson(xml: string): any | void {
    const options = {
        attributeNamePrefix: '',
        ignoreAttributes: false,
        ignoreNameSpace: true,
        parseAttributeValue: true
    };

    try {
        const parser = new XMLParser(options);
        return parser.parse(xml, true);
    } catch (error) {
        throw new Error(t('error.unparseableXML', { error }));
    }
}

/**
 * Gets all the schema namespaces and their aliases from the provided metadata.
 *
 * @param metadata - odata service metadata
 * @returns Array of namespaces and their aliases
 */
function getNamespaces(metadata: string): NamespaceAlias[] {
    const jsonMetadata: Object = xmlToJson(metadata);
    let schema = jsonMetadata['edmx:Edmx']?.['edmx:DataServices']?.['Schema'];

    if (!schema) {
        return [];
    }

    // Can be array or single item
    if (!Array.isArray(schema)) {
        schema = [schema];
    }

    return schema.map((item) => {
        return {
            namespace: item.Namespace,
            alias: item.Alias || ''
        };
    });
}

/**
 * Gets namespace aliases from the specified annotations xml.
 *
 * @param annotations - annotations definition as json
 * @param namespace - the namespace to search
 * @returns An alias for the specified namespace or empty string
 */
function getAliasFromAnnotation(annotations: Object, namespace: string): string {
    let references = annotations['edmx:Edmx']?.['edmx:Reference'];

    // Can be array or single item
    if (!Array.isArray(references)) {
        references = [references];
    }

    const annoNamespace = references.find(
        (ref) => ref['edmx:Include']?.['Namespace'] === namespace && ref['edmx:Include']?.['Alias']
    );
    return annoNamespace ? annoNamespace['edmx:Include']?.['Alias'] : '';
}

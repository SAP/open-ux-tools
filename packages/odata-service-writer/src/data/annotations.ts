import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { t } from '../i18n';
import { NamespaceAlias, OdataService } from '../types';

/**
 * Updates the passed odata service with the namespaces parsed from the specified metadata and annotations.
 * 
 * @param {Partial<OdataService>} service - an odata service where at least metadata and annotations properties are defined
 * @returns A reference to the namspaces array
 */
export function getAnnotationNamespaces(service: Partial<OdataService>): NamespaceAlias[] {
    // enhance service with annotations namespaces
    const schemaNamespaces = service.metadata ? getNamespaces(service.metadata) : [];

    return schemaNamespaces.map((schema: NamespaceAlias) => {
        // Check if alias exists in backend annotation file, if so use it
        if (service.annotations) {
            const annotationAlias =
                service.annotations.xml && schema.namespace
                    ? getAliasFromAnnotation(service.annotations.xml, schema.namespace)
                    : '';
            if (annotationAlias) {
                schema.alias = annotationAlias;
            }
        }
        return schema;
    });
}

/**
 * Convert specified xml string to JSON.
 *
 * @param xml - the schema to parse
 * @returns parsed object representation of passed XML
 */
function xmlToJson(xml: string): any | void {
    if (XMLValidator.validate(xml) !== true) {
        throw new Error(t('error.invalidXML'));
    }
    const options = {
        attributeNamePrefix: '',
        ignoreAttributes: false,
        ignoreNameSpace: true,
        parseAttributeValue: true
    };
    const parser = new XMLParser(options);
    return parser.parse(xml);
}

/**
 * Gets all the schema namespaces and their aliases from the provided metadata.
 *
 * @param metadata - odata service metadata
 * @returns Array of namespaces and their aliases
 */
function getNamespaces(metadata: string): NamespaceAlias[] {
    const jsonMetadata: any = xmlToJson(metadata);
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
 * @param annotationsXml - annotations definition xml
 * @param namespace - the namespace to search
 * @returns An alias for the specified namespace or empty string
 */
function getAliasFromAnnotation(annotationsXml: string, namespace: string): string {
    const annoJson: any = xmlToJson(annotationsXml);
    let references = annoJson['edmx:Edmx']?.['edmx:Reference'];

    // Can be array or single item
    if (!Array.isArray(references)) {
        references = [references];
    }

    const annoNamespace = references.find(
        (ref) => ref['edmx:Include']?.['Namespace'] === namespace && ref['edmx:Include']?.['Alias']
    );
    return annoNamespace ? annoNamespace['edmx:Include']?.['Alias'] : '';
}

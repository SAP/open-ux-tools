import { elementsWithName, getElementAttributeValue } from '@sap-ux/odata-annotation-core';
import type { Element, Range, Target } from '@sap-ux/odata-annotation-core-types';
import { Edm, Location } from '@sap-ux/odata-annotation-core-types';
import type {
    SupportedAnnotations,
    ODataAnnotations,
    UIDataFieldDefinition,
    UILineItemDefinition,
    ValueWithOrigin,
    UIReferenceFacetDefinition,
    UIFacetsDefinition,
    UIFieldGroupDefinition
} from './types';
import { UI_FACETS, UI_LINE_ITEM, UI_REFERENCE_FACET, UI_FIELD_GROUP, UI_DATA_FIELD } from './types';
import { logger } from '../logger';
import { createValue } from './builders';

type CollectorDefinition = {
    [A in SupportedAnnotations]: (target: Target, term: Element) => void;
};

/**
 * Finds a property element based on property name.
 *
 * @param name - Property name to search for.
 * @param properties - A list of properties which will be checked.
 * @returns First matching element if one exists.
 */
function findProperty(name: string, properties: Element[]): Element | undefined {
    return properties.find((property) => property.attributes[Edm.Property]?.value === name);
}

/**
 * Extracts supported OData annotation information from Target in preparation for conversion to SAP Annotations.
 */
class ODataAnnotationCollector implements CollectorDefinition {
    readonly annotations: ODataAnnotations[] = [];
    constructor(private readonly uri: string) {}

    [UI_LINE_ITEM](target: Target, term: Element): void {
        const collection = elementsWithName(Edm.Collection, term)[0];
        if (!collection) {
            logger.warn('Invalid UI.LineItem structure, missing "Collection" element.');
            return;
        }
        const lineItems: UILineItemDefinition = {
            term: UI_LINE_ITEM,
            target: this.createValue(target.name, target.nameRange),
            items: []
        };
        const qualifier = this.createValueFromAttribute(term, Edm.Qualifier);
        if (qualifier) {
            lineItems.qualifier = qualifier;
        }

        if (term.range) {
            lineItems.location = Location.create(this.uri, term.range);
        }

        for (const dataField of elementsWithName(Edm.Record, collection)) {
            const item = this.processDataField(dataField);
            if (item) {
                lineItems.items.push(item);
            }
        }

        this.annotations.push(lineItems);
    }

    [UI_FIELD_GROUP](target: Target, term: Element): void {
        const qualifier = term.attributes[Edm.Qualifier]?.value;
        const record = elementsWithName(Edm.Record, term)?.[0];
        if (!record) {
            logger.warn('Invalid UI.FieldGroup structure, missing root "Record" element.');
            return;
        }
        const fieldGroupProperties = elementsWithName(Edm.PropertyValue, record);
        const data = findProperty('Data', fieldGroupProperties);
        if (!data) {
            logger.warn('Invalid UI.FieldGroup structure, missing "Data" property.');
            return;
        }
        const collection = elementsWithName(Edm.Collection, data)[0];
        if (!collection) {
            logger.warn('Invalid UI.FieldGroup structure, missing "Collection" element in "Data" property.');
            return;
        }
        const annotation: UIFieldGroupDefinition = {
            term: UI_FIELD_GROUP,
            target: this.createValue(target.name, target.nameRange),
            data: []
        };

        if (qualifier) {
            annotation.qualifier = this.createValue(qualifier, term.attributes[Edm.Qualifier]?.valueRange);
        }

        if (term.range) {
            annotation.location = Location.create(this.uri, term.range);
        }

        for (const dataField of elementsWithName(Edm.Record, collection)) {
            const item = this.processDataField(dataField);
            if (item) {
                annotation.data.push(item);
            }
        }

        this.annotations.push(annotation);
    }

    [UI_FACETS](target: Target, term: Element): void {
        const collection = elementsWithName(Edm.Collection, term)[0];
        if (!collection) {
            logger.warn('Invalid UI.Facets structure, missing "Collection" element.');
            return;
        }

        const annotation: UIFacetsDefinition = {
            term: UI_FACETS,
            target: this.createValue(target.name, target.nameRange),
            facets: []
        };

        if (term.range) {
            annotation.location = Location.create(this.uri, term.range);
        }
        for (const facet of elementsWithName(Edm.Record, collection)) {
            const recordType = facet.attributes[Edm.Type]?.value ?? '';
            if (recordType !== 'UI.ReferenceFacet') {
                logger.warn(`Facet with type "${recordType}" is not supported!`);
                continue;
            }
            const properties = elementsWithName(Edm.PropertyValue, facet);
            const id = this.createValueFromPrimitiveRecordProperty('ID', Edm.String, properties);
            if (!id) {
                logger.warn(`ID for facet on "${target.name}" is required!`);
                continue;
            }
            const targetProperty = findProperty('Target', properties);
            const targetPropertyPathAttribute = targetProperty?.attributes?.[Edm.AnnotationPath];
            // Currently we assume that target annotation will always be UI.FieldGroup
            const [targetAnnotation, fieldGroupQualifier] = targetPropertyPathAttribute?.value?.split('#') ?? [];
            if (!fieldGroupQualifier) {
                logger.warn(`Could not find target qualifier for facet "${id.value}"!`);
                continue;
            }
            const targetQualifier = this.createValue(fieldGroupQualifier, targetPropertyPathAttribute?.valueRange);
            if (targetQualifier.location) {
                targetQualifier.location.range.start.character += targetAnnotation.length + 1; // do not include #
            }

            const item: UIReferenceFacetDefinition = {
                type: UI_REFERENCE_FACET,
                id,
                target: targetQualifier
            };

            const label = this.createValueFromPrimitiveRecordProperty('Label', Edm.String, properties);
            if (label) {
                item.label = label;
            }

            annotation.facets.push(item);
        }
        this.annotations.push(annotation);
    }

    private createValue<T>(value: T, range?: Range): ValueWithOrigin<T> {
        return createValue(value, this.uri, range);
    }

    private createValueFromPrimitiveRecordProperty(
        propertyName: string,
        valueType: Edm,
        properties: Element[]
    ): ValueWithOrigin<string> | undefined {
        const element = findProperty(propertyName, properties);
        return this.createValueFromAttribute(element, valueType);
    }

    private createValueFromPrimitiveRecordPropertyWithFirstMatchingType(
        propertyName: string,
        valueTypes: Edm[],
        properties: Element[]
    ): ValueWithOrigin<string> | undefined {
        const element = findProperty(propertyName, properties);
        for (const type of valueTypes) {
            const value = this.createValueFromAttribute(element, type);

            if (value) {
                return value;
            }
        }
        return undefined;
    }

    private createValueFromAttribute(
        element: Element | undefined,
        attributeName: Edm
    ): ValueWithOrigin<string> | undefined {
        const attribute = element?.attributes?.[attributeName];
        const attributeValue = attribute?.value;
        if (attributeValue) {
            return createValue(attributeValue, this.uri, attribute.valueRange);
        }

        return undefined;
    }

    private processDataField(dataField: Element): UIDataFieldDefinition | undefined {
        const properties = elementsWithName(Edm.PropertyValue, dataField);
        const value = this.createValueFromPrimitiveRecordPropertyWithFirstMatchingType(
            'Value',
            [Edm.Path, Edm.PropertyPath],
            properties
        );

        if (!value) {
            logger.warn('Invalid UI.DataField structure, missing "Value" property.');
            return undefined;
        }

        const result: UIDataFieldDefinition = {
            type: UI_DATA_FIELD,
            value
        };

        const label = this.createValueFromPrimitiveRecordProperty('Label', Edm.String, properties);
        if (label) {
            result.label = label;
        }

        return result;
    }
}

/**
 * Extracts supported OData annotation information from Target in preparation for conversion to SAP Annotations.
 *
 * @param uri - Document URI.
 * @param input - Targets with OData annotation for processing.
 * @returns A list of supported OData annotations found in targets.
 */
export function collectODataAnnotations(uri: string, input: Target[]): ODataAnnotations[] {
    const collector = new ODataAnnotationCollector(uri);
    for (const target of input) {
        for (const term of target.terms) {
            const termName = getElementAttributeValue(term, Edm.Term) as SupportedAnnotations;
            const handler = collector[termName];
            if (typeof handler === 'function') {
                collector[termName](target, term);
            } else {
                logger.warn(`No handler found for ${termName}`);
            }
        }
    }
    return collector.annotations;
}

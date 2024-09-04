import { elementsWithName, getElementAttributeValue } from '@sap-ux/odata-annotation-core';
import type { Attribute, Element, Range, Target } from '@sap-ux/odata-annotation-core-types';
import { createElementNode, createTarget, Edm, ELEMENT_TYPE, Location } from '@sap-ux/odata-annotation-core-types';
import type {
    SupportedAnnotations,
    ODataAnnotations,
    UIDataFieldDefinition,
    UILineItemDefinition,
    ValueWithOrigin,
    UIReferenceFacetDefinition,
    UIFacetsDefinition,
    UIFieldGroupDefinition,
    CommonValueListDefinition,
    CommonValueListParameterInOutDefinition,
    CommonValueListParameterDisplayOnlyDefinition
} from './types';
import {
    UI_FACETS,
    UI_LINE_ITEM,
    UI_REFERENCE_FACET,
    UI_FIELD_GROUP,
    UI_DATA_FIELD,
    COMMON_VALUE_LIST,
    COMMON_VALUE_LIST_PARAMETER_DISPLAY_ONLY,
    COMMON_VALUE_LIST_PARAMETER_IN_OUT
} from './types';

// type CollectorFunction = (target: Target, term: Element) => ODataAnnotations[];

type CollectorDefinition = {
    [A in SupportedAnnotations]: (target: Target, term: Element) => void;
};

class ODataAnnotationCollector implements CollectorDefinition {
    readonly annotations: ODataAnnotations[] = [];
    constructor(private readonly uri: string) {}

    [UI_LINE_ITEM](target: Target, term: Element): void {
        console.log(term);
        const qualifier = term.attributes[Edm.Qualifier]?.value;

        const collection = term.content.find(
            (child): child is Element => child.type === ELEMENT_TYPE && child.name === Edm.Collection
        );
        if (!collection) {
            // TODO: error handling?
            return;
        }
        const lineItems: UILineItemDefinition = {
            term: UI_LINE_ITEM,
            target: this.createValue(target.name, target.nameRange),
            items: []
        };

        if (qualifier) {
            lineItems.qualifier = this.createValue(qualifier, term.attributes[Edm.Qualifier]?.valueRange);
        }

        if (term.range) {
            lineItems.location = Location.create(this.uri, term.range);
        }

        for (const dataField of elementsWithName(Edm.Record, collection)) {
            const properties = elementsWithName(Edm.PropertyValue, dataField);
            const valueProperty = properties.find((property) => property.attributes[Edm.Property]?.value === 'Value');
            const label = properties.find((property) => property.attributes[Edm.Property]?.value === 'Label');
            // todo test with multiple path values
            const valueAttribute = this.getPathAttribute(valueProperty);
            // TODO: check record
            if (!valueAttribute) {
                // TODO: error handling?
                continue;
            }

            // const targetName = [parentName, value].join('/'); // TODO: handle no value
            // let target = this.targets.get(targetName);
            // if (!target) {
            //     target = createTarget(targetName);
            //     this.targets.set(targetName, target);
            // }
            const item: UIDataFieldDefinition = {
                type: UI_DATA_FIELD,
                value: this.createValue(valueAttribute.value, valueAttribute.valueRange)
            };
            const labelValue = label?.attributes?.[Edm.String]?.value;
            if (labelValue) {
                item.label = this.createValue(labelValue, label?.attributes?.[Edm.String]?.valueRange);
            }
            lineItems.items.push(item);
        }

        this.annotations.push(lineItems);
    }

    [UI_FIELD_GROUP](target: Target, term: Element): void {
        // TODO: check what to do with label
        const qualifier = term.attributes[Edm.Qualifier]?.value;
        console.log(term);
        const record = elementsWithName(Edm.Record, term)?.[0];
        if (!record) {
            // TODO: error handling?
            return;
        }
        const fieldGroupProperties = elementsWithName(Edm.PropertyValue, record);
        const data = fieldGroupProperties.find((property) => property.attributes[Edm.Property]?.value === 'Data');
        if (!data) {
            // TODO: error handling?
            return;
        }
        const collection = elementsWithName(Edm.Collection, data)[0];
        if (!collection) {
            // TODO: error handling?
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
            const properties = elementsWithName(Edm.PropertyValue, dataField);
            const valueProperty = properties.find((property) => property.attributes[Edm.Property]?.value === 'Value');
            const label = properties.find((property) => property.attributes[Edm.Property]?.value === 'Label');
            const valueAttribute = this.getPathAttribute(valueProperty);
            // TODO: check record
            if (!valueAttribute) {
                // TODO: error handling?
                continue;
            }

            // const targetName = [parentName, value].join('/'); // TODO: handle no value
            // let target = this.targets.get(targetName);
            // if (!target) {
            //     target = createTarget(targetName);
            //     this.targets.set(targetName, target);
            // }
            const item: UIDataFieldDefinition = {
                type: UI_DATA_FIELD,
                value: this.createValue(valueAttribute.value, valueAttribute.valueRange)
            };
            const labelValue = label?.attributes?.[Edm.String]?.value;
            if (labelValue) {
                item.label = this.createValue(labelValue, label?.attributes?.[Edm.String]?.valueRange);
            }
            annotation.data.push(item);
        }

        this.annotations.push(annotation);
    }

    [COMMON_VALUE_LIST](target: Target, term: Element): void {
        // TODO: check what to do with label
        const qualifier = term.attributes[Edm.Qualifier]?.value;
        console.log(term);
        const record = elementsWithName(Edm.Record, term)?.[0];
        if (!record) {
            // TODO: error handling?
            return;
        }
        const fieldGroupProperties = elementsWithName(Edm.PropertyValue, record);
        const collectionPathProperty = fieldGroupProperties.find(
            (property) => property.attributes[Edm.Property]?.value === 'CollectionPath'
        );
        const collectionPath = collectionPathProperty?.attributes?.[Edm.String]?.value;
        if (!collectionPath) {
            // TODO: error handling?
            return;
        }
        const parameters = fieldGroupProperties.find(
            (property) => property.attributes[Edm.Property]?.value === 'Parameters'
        );
        if (!parameters) {
            // TODO: error handling?
            return;
        }
        const collection = elementsWithName(Edm.Collection, parameters)[0];
        if (!collection) {
            // TODO: error handling?
            return;
        }
        const annotation: CommonValueListDefinition = {
            term: COMMON_VALUE_LIST,
            target: this.createValue(target.name, target.nameRange),
            collectionPath: this.createValue(collectionPath, collectionPathProperty.attributes[Edm.String].valueRange),
            parameters: []
        };

        if (qualifier) {
            annotation.qualifier = this.createValue(qualifier, term.attributes[Edm.Qualifier]?.valueRange);
        }

        if (term.range) {
            annotation.location = Location.create(this.uri, term.range);
        }

        for (const dataField of elementsWithName(Edm.Record, collection)) {
            const type = dataField.attributes[Edm.Type]?.value;
            if (type === COMMON_VALUE_LIST_PARAMETER_DISPLAY_ONLY) {
                const properties = elementsWithName(Edm.PropertyValue, dataField);

                const valueListProperty = properties.find(
                    (property) => property.attributes[Edm.Property]?.value === 'ValueListProperty'
                );

                const value = valueListProperty?.attributes?.[Edm.String]?.value ?? '';
                // TODO: check record
                if (!value) {
                    // TODO: error handling?
                    continue;
                }

                const item: CommonValueListParameterDisplayOnlyDefinition = {
                    type: COMMON_VALUE_LIST_PARAMETER_DISPLAY_ONLY,
                    valueListProperty: this.createValue(value, valueListProperty?.attributes?.[Edm.String]?.valueRange)
                };
                annotation.parameters.push(item);
            } else if (type === COMMON_VALUE_LIST_PARAMETER_IN_OUT) {
                const properties = elementsWithName(Edm.PropertyValue, dataField);
                const localDataProperty = properties.find(
                    (property) => property.attributes[Edm.Property]?.value === 'LocalDataProperty'
                );
                const valueListProperty = properties.find(
                    (property) => property.attributes[Edm.Property]?.value === 'ValueListProperty'
                );
                const localDataValue = localDataProperty?.attributes?.[Edm.PropertyPath]?.value ?? '';
                // TODO: check record
                if (!localDataValue) {
                    // TODO: error handling?
                    continue;
                }

                const value = valueListProperty?.attributes?.[Edm.String]?.value ?? '';
                // TODO: check record
                if (!value) {
                    // TODO: error handling?
                    continue;
                }

                const item: CommonValueListParameterInOutDefinition = {
                    type: COMMON_VALUE_LIST_PARAMETER_IN_OUT,
                    valueListProperty: this.createValue(value, valueListProperty?.attributes?.[Edm.String]?.valueRange),
                    localDataProperty: this.createValue(
                        value,
                        localDataProperty?.attributes?.[Edm.PropertyPath]?.valueRange
                    )
                };
                annotation.parameters.push(item);
            }
        }
        const label = fieldGroupProperties.find((property) => property.attributes[Edm.Property]?.value === 'Label');

        const labelValue = label?.attributes?.[Edm.String]?.value;
        if (labelValue) {
            annotation.label = this.createValue(labelValue, label?.attributes?.[Edm.String]?.valueRange);
        }
        this.annotations.push(annotation);
    }

    [UI_FACETS](target: Target, term: Element): void {
        console.log(term);
        const collection = term.content.find(
            (child): child is Element => child.type === ELEMENT_TYPE && child.name === Edm.Collection
        );
        if (!collection) {
            // TODO: error handling?
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
            const recordType = facet.attributes[Edm.Type]?.value;
            if (recordType !== 'UI.ReferenceFacet') {
                console.warn(`Facet ${recordType} type is not supported!`);
                return;
            }
            const properties = elementsWithName(Edm.PropertyValue, facet);
            const idProperty = properties.find((property) => property.attributes[Edm.Property]?.value === 'ID');
            const id = idProperty?.attributes?.[Edm.String]?.value;
            console.log(annotation);
            if (!id) {
                console.warn(`ID for facet on '${target.name}' is required!`);
                return;
            }
            const targetProperty = properties.find((property) => property.attributes[Edm.Property]?.value === 'Target');
            const fieldGroupQualifier = targetProperty?.attributes?.[Edm.AnnotationPath]?.value?.split('#')[1];
            if (!fieldGroupQualifier) {
                console.warn(`Could not find target qualifier for facet '${id}'!`);
                return;
            }
            const label = properties.find((property) => property.attributes[Edm.Property]?.value === 'Label');

            const item: UIReferenceFacetDefinition = {
                type: UI_REFERENCE_FACET,
                id: this.createValue(id, idProperty?.attributes?.[Edm.String]?.valueRange),
                // TODO: create correct range for target to only include the qualifier
                target: this.createValue(
                    fieldGroupQualifier,
                    targetProperty?.attributes?.[Edm.AnnotationPath]?.valueRange
                )
            };

            const labelValue = label?.attributes?.[Edm.String]?.value;
            if (labelValue) {
                item.label = this.createValue(labelValue, label?.attributes?.[Edm.String]?.valueRange);
            }

            annotation.facets.push(item);
        }
        this.annotations.push(annotation);
    }
    private createValue<T>(value: T, range?: Range): ValueWithOrigin<T> {
        const result: ValueWithOrigin<T> = {
            value
        };
        if (range) {
            result.location = Location.create(this.uri, range);
        }

        return result;
    }

    private getPathAttribute(element: Element | undefined): Attribute | undefined {
        if (!element) {
            return undefined;
        }
        const attribute = element?.attributes?.[Edm.PropertyPath];
        if (attribute) {
            return attribute;
        }
        return element?.attributes?.[Edm.Path];
    }
}

/**
 *
 * @param uri
 * @param input
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
                console.warn(`No handler found for ${termName}`);
                // warn
            }
        }
    }
    return collector.annotations;
}

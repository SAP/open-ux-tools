import { elementsWithName, getElementAttributeValue } from '@sap-ux/odata-annotation-core';
import type { Target, Element, ElementChild } from '@sap-ux/odata-annotation-core-types';
import {
    createAttributeNode,
    createElementNode,
    createTarget,
    Edm,
    ELEMENT_TYPE
} from '@sap-ux/odata-annotation-core-types';
import type {
    CommonValueListDefinition,
    CommonValueListParameterInOutDefinition,
    ODataAnnotations,
    UIFacetsDefinition,
    UIFieldGroupDefinition,
    UILineItemDefinition
} from './types';
import {
    SupportedAnnotations,
    UI_LINE_ITEM,
    UI_FACETS,
    UI_REFERENCE_FACET,
    UI_FIELD_GROUP,
    COMMON_VALUE_LIST,
    COMMON_VALUE_LIST_PARAMETER_IN_OUT
} from './types';
import { collectODataAnnotations } from './collector';

function createPrimitiveElement(
    elementName: Edm,
    nameAttribute: Edm,
    name: string,
    valueType: Edm,
    value: string
): Element {
    return createElementNode({
        name: elementName,
        attributes: {
            [nameAttribute]: createAttributeNode(nameAttribute, name),
            [valueType]: createAttributeNode(valueType, value)
        }
    });
}

function createComplexElement(elementName: Edm, nameAttribute: Edm, name: string, content: ElementChild[]): Element {
    return createElementNode({
        name: elementName,
        attributes: {
            [nameAttribute]: createAttributeNode(nameAttribute, name)
        },
        content
    });
}

function createPrimitiveRecordProperty(name: string, valueType: Edm, value: string): Element {
    return createPrimitiveElement(Edm.PropertyValue, Edm.Property, name, valueType, value);
}

function createComplexRecordProperty(name: string, value: Element): Element {
    return createComplexElement(Edm.PropertyValue, Edm.Property, name, [value]);
}

function createPrimitiveAnnotation(termName: string, valueType: Edm, value: string): Element {
    return createPrimitiveElement(Edm.Annotation, Edm.Term, termName, valueType, value);
}

function createComplexAnnotation(termName: string, content: ElementChild[]): Element {
    return createElementNode({
        name: Edm.Annotation,
        attributes: {
            [Edm.Term]: createAttributeNode(Edm.Term, termName)
        },
        content
    });
}

/**
 * Converts OData annotations to SAP annotations.
 */
export class SAPAnnotationConverter {
    private targets = new Map<string, Target>();
    private targetProperties = new Map<string, Set<string>>();

    /**
     * Converts OData annotations to SAP annotations.
     *
     * @param input Targets grouped by files with OData annotations.
     * @returns Targets with SAP annotations.
     */
    convertTargets(input: Record<string, Target[]>): Target[] {
        this.targets.clear();
        const annotations: ODataAnnotations[] = [];
        for (const [uri, targets] of Object.entries(input)) {
            const fileAnnotations = collectODataAnnotations(uri, targets);
            for (const annotation of fileAnnotations) {
                annotations.push(annotation);
            }
        }
        console.log(JSON.stringify(annotations, undefined, 2));
        this.processLineItems(annotations);
        this.processValueHelps(annotations);
        this.processFieldGroups(annotations);
        // Following functions expect that all the other annotations have been processed
        this.processFacets(annotations);
        return [...this.targets.values()];
    }

    private getTarget(name: string): Target {
        let target = this.targets.get(name);
        if (!target) {
            target = createTarget(name);
            this.targets.set(name, target);
        }
        return target;
    }

    /**
     * Gets target node by name and collects annotated properties.
     *
     * @param targetName - Name of the target entity.
     * @param propertyName - Name of the property.
     * @returns Target node.
     */
    private getPropertyTarget(targetName: string, propertyName: string): Target {
        const name = [targetName, propertyName].join('/');
        const target = this.getTarget(name);
        let targetProperties = this.targetProperties.get(targetName);
        if (!targetProperties) {
            targetProperties = new Set();
            this.targetProperties.set(targetName, targetProperties);
        }
        targetProperties.add(propertyName);
        return target;
    }

    private processLineItems(annotations: ODataAnnotations[]): void {
        // TODO: check what to do with label
        // const qualifier = term.attributes[Edm.Qualifier]?.value;
        const definitions = annotations.filter(
            (annotation): annotation is UILineItemDefinition => annotation.term === UI_LINE_ITEM
        );
        for (const definition of definitions) {
            let position = 10;
            for (const dataField of definition.items) {
                const target = this.getPropertyTarget(definition.target.value, dataField.value.value);
                target.terms.push(
                    createComplexAnnotation('UI.lineItem', [
                        createElementNode({
                            name: Edm.Collection,
                            content: [
                                createElementNode({
                                    name: Edm.Record,
                                    content: [
                                        createPrimitiveRecordProperty('position', Edm.Int, position.toString()),
                                        createPrimitiveRecordProperty('importance', Edm.EnumMember, 'HIGH')
                                    ]
                                })
                            ]
                        })
                    ])
                );

                if (dataField.label) {
                    target.terms.push(
                        createPrimitiveAnnotation('EndUserText.label', Edm.String, dataField.label.value)
                    );
                }
                position += 10;
            }
        }
    }
    private processValueHelps(annotations: ODataAnnotations[]): void {
        // TODO: check what to do with label
        // const qualifier = term.attributes[Edm.Qualifier]?.value;
        const definitions = annotations.filter(
            (annotation): annotation is CommonValueListDefinition => annotation.term === COMMON_VALUE_LIST
        );
        for (const definition of definitions) {
            const target = this.getTarget(definition.target.value);
            const parameter = definition.parameters.find(
                (parameter): parameter is CommonValueListParameterInOutDefinition =>
                    parameter.type === COMMON_VALUE_LIST_PARAMETER_IN_OUT
            );
            const entityProperties = [
                createPrimitiveRecordProperty('name', Edm.String, definition.collectionPath.value)
            ];
            if (!parameter) {
                // TODO: error handling
                return;
            }
            entityProperties.push(
                createPrimitiveRecordProperty('element', Edm.String, parameter.valueListProperty.value)
            );

            const properties: Element[] = [
                createComplexRecordProperty(
                    'entity',
                    createElementNode({
                        name: Edm.Record,
                        content: entityProperties
                    })
                )

                // createPrimitiveRecordProperty('importance', Edm.EnumMember, 'HIGH')
            ];

            // const bindings: Element[] = [];
            const annotation = createComplexAnnotation('Consumption.valueHelpDefinition', [
                createElementNode({
                    name: Edm.Collection,
                    content: [
                        createElementNode({
                            name: Edm.Record,
                            content: properties
                        })
                    ]
                })
            ]);

            target.terms.push(annotation);
        }
    }
    private processFieldGroups(annotations: ODataAnnotations[]): void {
        // TODO: check what to do with label
        // const qualifier = term.attributes[Edm.Qualifier]?.value;
        const definitions = annotations.filter(
            (annotation): annotation is UIFieldGroupDefinition => annotation.term === UI_FIELD_GROUP
        );
        for (const definition of definitions) {
            let position = 10;
            for (const dataField of definition.data) {
                const target = this.getPropertyTarget(definition.target.value, dataField.value.value);
                const additionalProperties: Element[] = [];
                if (definition.qualifier) {
                    additionalProperties.push(
                        createPrimitiveRecordProperty('qualifier', Edm.String, definition.qualifier.value)
                    );
                }
                target.terms.push(
                    createComplexAnnotation('UI.fieldGroup', [
                        createElementNode({
                            name: Edm.Collection,
                            content: [
                                createElementNode({
                                    name: Edm.Record,
                                    content: [
                                        createPrimitiveRecordProperty('position', Edm.Int, position.toString()),
                                        ...additionalProperties
                                    ]
                                })
                            ]
                        })
                    ])
                );

                if (dataField.label) {
                    target.terms.push(
                        createPrimitiveAnnotation('EndUserText.label', Edm.String, dataField.label.value)
                    );
                }
                position += 10;
            }
        }
    }

    /**
     * Adds facet annotations.
     * **Important** this needs to happen at the end of all annotation processing to correctly
     * attach facet annotation.
     *
     * @param annotations - OData annotations.
     */
    private processFacets(annotations: ODataAnnotations[]): void {
        // TODO: check what to do with label
        const definitions = annotations.filter(
            (annotation): annotation is UIFacetsDefinition => annotation.term === UI_FACETS
        );
        for (const definition of definitions) {
            let position = 10;
            const entityName = definition.target.value;
            const propertyName = this.targetProperties.get(entityName)?.values()?.next()?.value;
            if (!propertyName) {
                console.log(`Could not find a property to which attach Facets annotation for entity ${entityName}`);
                return;
            }
            const targetName = [entityName, propertyName].join('/');
            const target = this.getTarget(targetName);
            const content: Element[] = [];
            const annotation = createComplexAnnotation('UI.facet', [
                createElementNode({
                    name: Edm.Collection,
                    content
                })
            ]);

            for (const facet of definition.facets) {
                if (facet.type === UI_REFERENCE_FACET) {
                    const node = createElementNode({
                        name: Edm.Record,
                        content: [
                            createPrimitiveRecordProperty('id', Edm.String, facet.id.value),
                            createPrimitiveRecordProperty('purpose', Edm.EnumMember, 'STANDARD'),
                            createPrimitiveRecordProperty('type', Edm.EnumMember, 'FIELDGROUP_REFERENCE'),
                            createPrimitiveRecordProperty('targetQualifier', Edm.String, facet.target.value),
                            createPrimitiveRecordProperty('position', Edm.Int, position.toString())
                        ]
                    });
                    if (facet.label) {
                        node.content.push(createPrimitiveRecordProperty('label', Edm.String, facet.label.value));
                    }
                    position += 10;

                    content.push(node);
                }
            }

            target.terms.push(annotation);
        }
    }
}

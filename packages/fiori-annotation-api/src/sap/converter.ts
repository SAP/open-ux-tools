import type { Target, Element } from '@sap-ux/odata-annotation-core-types';
import { createElementNode, createTarget, Edm } from '@sap-ux/odata-annotation-core-types';

import type {
    ODataAnnotations,
    UIFacetsDefinition,
    UIFieldGroupDefinition,
    UILineItemDefinition,
    ValueWithOrigin
} from './types';
import { UI_LINE_ITEM, UI_FACETS, UI_REFERENCE_FACET, UI_FIELD_GROUP } from './types';
import { collectODataAnnotations } from './collector';
import {
    createComplexAnnotation,
    createPrimitiveAnnotation,
    createPrimitiveRecordProperty,
    createRecord
} from './builders';
import { logger } from '../logger';

type LabelDefinition = { source: ODataAnnotations['term']; value: ValueWithOrigin<string> };
/**
 * Converts OData annotations to SAP annotations.
 */
export class SAPAnnotationConverter {
    private targets = new Map<string, Target>();
    private labels = new Map<string, LabelDefinition[]>();
    private targetProperties = new Map<string, Set<string>>();

    /**
     * Converts OData annotations to SAP annotations.
     *
     * @param annotations - A list of OData annotations.
     * @returns Targets with SAP annotations.
     */
    convertAnnotations(annotations: ODataAnnotations[]): Target[] {
        this.targets.clear();
        this.targetProperties.clear();
        this.labels.clear();

        this.processLineItems(annotations);
        this.processFieldGroups(annotations);
        // Following functions expect that all the other annotations have been processed
        this.processFacets(annotations);
        this.processLabels();
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

    private addLabel(target: string, term: ODataAnnotations['term'], value: ValueWithOrigin<string>): void {
        let labels = this.labels.get(target);
        if (!labels) {
            labels = [];
            this.labels.set(target, labels);
        }
        labels.push({
            source: term,
            value
        });
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
        const definitions = annotations.filter(
            (annotation): annotation is UILineItemDefinition => annotation.term === UI_LINE_ITEM
        );
        for (const definition of definitions) {
            let position = 10;
            for (const dataField of definition.items) {
                const target = this.getPropertyTarget(definition.target.value, dataField.value.value);
                target.terms.push(
                    createComplexAnnotation(
                        'UI.lineItem',
                        createElementNode({
                            name: Edm.Collection,
                            content: [
                                createRecord([
                                    createPrimitiveRecordProperty('position', Edm.Int, position.toString()),
                                    createPrimitiveRecordProperty('importance', Edm.EnumMember, 'HIGH')
                                ])
                            ]
                        })
                    )
                );

                if (dataField.label) {
                    this.addLabel(target.name, UI_LINE_ITEM, dataField.label);
                }
                position += 10;
            }
        }
    }

    private processFieldGroups(annotations: ODataAnnotations[]): void {
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
                    createComplexAnnotation(
                        'UI.fieldGroup',
                        createElementNode({
                            name: Edm.Collection,
                            content: [
                                createRecord([
                                    createPrimitiveRecordProperty('position', Edm.Int, position.toString()),
                                    ...additionalProperties
                                ])
                            ]
                        })
                    )
                );

                if (dataField.label) {
                    this.addLabel(target.name, UI_FIELD_GROUP, dataField.label);
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
        const definitions = annotations.filter(
            (annotation): annotation is UIFacetsDefinition => annotation.term === UI_FACETS
        );
        for (const definition of definitions) {
            let position = 10;
            const entityName = definition.target.value;
            const propertyName = this.targetProperties.get(entityName)?.values()?.next()?.value;
            if (!propertyName) {
                logger.warn(`Could not find a property to which attach Facets annotation for entity "${entityName}"`);
                return;
            }
            const targetName = [entityName, propertyName].join('/');
            const target = this.getTarget(targetName);
            const content: Element[] = [];
            const annotation = createComplexAnnotation(
                'UI.facet',
                createElementNode({
                    name: Edm.Collection,
                    content
                })
            );

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

    /**
     * Adds labels from multiple sources.
     * Priority is in annotation processing order (LineItem > FieldGroup).
     */
    private processLabels(): void {
        for (const [targetName, definitions] of this.labels.entries()) {
            const target = this.getTarget(targetName);
            const definition = definitions[0];
            if (definition) {
                target.terms.push(createPrimitiveAnnotation('EndUserText.label', Edm.String, definition.value.value));
            }
        }
    }
}

/**
 * Converts OData annotations to SAP annotations.
 *
 * @param input Targets grouped by files with OData annotations.
 * @returns Targets with SAP annotations.
 */
export function convertTargets(input: Record<string, Target[]>): Target[] {
    const converter = new SAPAnnotationConverter();
    const annotations: ODataAnnotations[] = [];
    for (const [uri, targets] of Object.entries(input)) {
        const fileAnnotations = collectODataAnnotations(uri, targets);
        for (const annotation of fileAnnotations) {
            annotations.push(annotation);
        }
    }
    return converter.convertAnnotations(annotations);
}

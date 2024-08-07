import type { Element, TextNode } from '@sap-ux/odata-annotation-core';
import { createElementNode, createTextNode, createAttributeNode, Edm } from '@sap-ux/odata-annotation-core';

import { DiagnosticSeverity } from '@sap-ux/text-document-utils';
import type {
    AnnotationNode,
    Record,
    StringLiteral,
    BooleanLiteral,
    NumberLiteral,
    AnnotationValue,
    RecordProperty
} from '@sap-ux/cds-annotation-parser';
import {
    RECORD_TYPE,
    nodeRange,
    STRING_LITERAL_TYPE,
    COLLECTION_TYPE,
    EMPTY_VALUE_TYPE,
    BOOLEAN_TYPE,
    NUMBER_LITERAL_TYPE
} from '@sap-ux/cds-annotation-parser';
import { i18n } from '../../../i18n';
import type { VisitorState } from '../visitor-state';
import { numberHandler } from './number';
import { isSubtree } from '../handler';

type VisitorTypes =
    | typeof RECORD_TYPE
    | typeof COLLECTION_TYPE
    | typeof STRING_LITERAL_TYPE
    | typeof BOOLEAN_TYPE
    | typeof EMPTY_VALUE_TYPE
    | typeof NUMBER_LITERAL_TYPE;

type VisitNodeTypes = Extract<AnnotationNode, VisitorTypes>;

/**
 *
 */
export class EdmJsonVisitor {
    isElementPathKind = (elementName: string): boolean => {
        return [
            Edm.Path,
            Edm.PropertyPath,
            Edm.AnnotationPath,
            Edm.ModelElementPath,
            Edm.NavigationPropertyPath
        ].includes(elementName as Edm);
    };
    /**
     *
     * @param state - The visitor state.
     */
    constructor(private state: VisitorState) {}

    /**
     * Visits the given AnnotationNode and invokes the corresponding visitor function based on the node type.
     *
     * @param node - The AnnotationNode to be visited.
     * @returns Returns an Element or undefined based on the visitor function for the given node type.
     */
    visit(node: AnnotationNode): Element | undefined {
        const visitor = this[node.type as VisitorTypes];
        if (visitor) {
            return visitor(node as VisitNodeTypes);
        } else {
            return undefined;
        }
    }
    [RECORD_TYPE] = (record: Record): Element | undefined => {
        const element: Element = createElementNode({
            name: '',
            range: nodeRange(record, true),
            contentRange: nodeRange(record, false)
        });

        for (let i = 0; i < record.properties.length; i++) {
            const property = record.properties[i];
            if (property.name.value.startsWith('$')) {
                if (i === 0) {
                    this.convertElementName(property, element);
                } else if (STRING_LITERAL_TYPE === property.value?.type || EMPTY_VALUE_TYPE === property.value?.type) {
                    this.convertAttribute(property, element);
                } else if (property.value?.range) {
                    this.state.addDiagnostic({
                        range: property.value.range,
                        severity: DiagnosticSeverity.Error,
                        message: i18n.t('The_attribute_value_must_be_a_string_literal')
                    });
                }
            }
        }

        if (element.name === '') {
            // failed to determine element name -> we can't generate a correct element
            return undefined;
        }

        return element;
    };

    /**
     * Converts a RecordProperty representing an attribute into an Element and adds it to the provided Element.
     *
     * @param property - The RecordProperty representing the attribute.
     * @param element - The Element to which the attribute will be added.
     */
    convertAttribute(property: RecordProperty, element: Element): void {
        if (property.value) {
            const name = property.name.value.substring(1);
            element.attributes[name] = createAttributeNode(
                name,
                property.value?.type === STRING_LITERAL_TYPE ? property.value.value : '',
                nodeRange(property.name, false),
                property.value.range
            );

            if (property.value.type === STRING_LITERAL_TYPE && this.isElementPathKind(name)) {
                this.state.addPath(property.value.value);
            }
        }
    }

    /**
     * Converts an element name based on the provided RecordProperty and Element.
     *
     * @param property - The RecordProperty containing the element name.
     * @param element - The Element to be converted.
     */
    convertElementName(property: RecordProperty, element: Element): void {
        element.name = property.name.value.substring(1);
        element.nameRange = property.name.range;
        if (property.value?.type === STRING_LITERAL_TYPE) {
            const textNode: TextNode = createTextNode(property.value.value, nodeRange(property.value, false));
            element.content = [textNode];
            if (this.isElementPathKind(element.name)) {
                this.state.addPath(property.value.value);
            }
        } else if (property.value?.type === COLLECTION_TYPE) {
            // Record is used as a container for a single element here
            this.convertCollection(property.value.items, element);
        } else if (property.value) {
            const child = this.visit(property.value);
            if (child) {
                element.content.push(child);
            }
        }
    }

    /**
     * Converts a collection of AnnotationValue items into Elements and adds them to the provided Element.
     *
     * @param items - The collection of AnnotationValue items to be converted.
     * @param element - The Element to which the converted items will be added.
     */
    convertCollection(items: AnnotationValue[], element: Element): void {
        for (const item of items) {
            const child = this.visit(item);
            if (child) {
                element.content.push(child);
            }
        }
    }

    [COLLECTION_TYPE] = (): Element | undefined => {
        return undefined;
    };
    [EMPTY_VALUE_TYPE] = (): Element | undefined => {
        return undefined;
    };
    [STRING_LITERAL_TYPE] = (node: StringLiteral): Element | undefined => {
        const textNode: TextNode = createTextNode(node.value, nodeRange(node, false));
        return createElementNode({
            name: Edm.String,
            range: nodeRange(node, true),
            contentRange: nodeRange(node, false),
            content: [textNode]
        });
    };
    [BOOLEAN_TYPE] = (node: BooleanLiteral): Element | undefined => {
        let text = '';
        if (node.value === true) {
            text = 'true';
        } else if (node.value === false) {
            text = 'false';
        }
        const element: Element = createElementNode({
            name: Edm.Bool,
            range: nodeRange(node, true),
            contentRange: nodeRange(node, false),
            content: [createTextNode(text, nodeRange(node, false))]
        });
        return element;
    };

    [NUMBER_LITERAL_TYPE] = (node: NumberLiteral): Element | undefined => {
        const result = numberHandler.convert(this.state, node);
        if (result === undefined || isSubtree(result)) {
            return undefined;
        }
        return result;
    };
}

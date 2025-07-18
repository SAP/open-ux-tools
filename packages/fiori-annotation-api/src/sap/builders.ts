import type { ElementChild, Element, Range } from '@sap-ux/odata-annotation-core-types';
import { Edm, createElementNode, createAttributeNode, Location } from '@sap-ux/odata-annotation-core-types';

import type { ValueWithOrigin } from './types';

function createComplexElement(elementName: Edm, nameAttribute: Edm, name: string, content: ElementChild[]): Element {
    return createElementNode({
        name: elementName,
        attributes: {
            [nameAttribute]: createAttributeNode(nameAttribute, name)
        },
        content
    });
}

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

/**
 * Factory function for PropertyValue node with a primitive (attribute) value.
 *
 * @param name - Name of the property.
 * @param valueType - Type of the property.
 * @param value - Value of the property.
 * @returns PropertyValue node.
 */
export function createPrimitiveRecordProperty(name: string, valueType: Edm, value: string): Element {
    return createPrimitiveElement(Edm.PropertyValue, Edm.Property, name, valueType, value);
}

/**
 * Factory function for PropertyValue node with a complex (child element) value.
 *
 * @param name - Name of the property.
 * @param value - Value of the property.
 * @returns PropertyValue node.
 */
export function createComplexRecordProperty(name: string, value: Element): Element {
    return createComplexElement(Edm.PropertyValue, Edm.Property, name, [value]);
}

/**
 * Factory function for Annotation node with a primitive (attribute) value.
 *
 * @param termName - Annotation term.
 * @param valueType - Type of the annotation value.
 * @param value - Value of the annotation.
 * @returns Annotation node.
 */
export function createPrimitiveAnnotation(termName: string, valueType: Edm, value: string): Element {
    return createPrimitiveElement(Edm.Annotation, Edm.Term, termName, valueType, value);
}

/**
 * Factory function for Annotation node with a primitive (child element) value.
 *
 * @param termName - Annotation term.
 * @param value - Value of the annotation.
 * @returns Annotation node.
 */
export function createComplexAnnotation(termName: string, value: ElementChild): Element {
    return createElementNode({
        name: Edm.Annotation,
        attributes: {
            [Edm.Term]: createAttributeNode(Edm.Term, termName)
        },
        content: [value]
    });
}

/**
 * Factory function for Record node.
 *
 * @param properties - Record properties.
 * @param type - Record type.
 * @returns Record node.
 */
export function createRecord(properties: Element[], type?: string): Element {
    const node = createElementNode({
        name: Edm.Record,
        content: properties
    });
    if (type !== undefined) {
        node.attributes[Edm.Type] = createAttributeNode(Edm.Type, type);
    }
    return node;
}

/**
 * Factory function for value with origin.
 *
 * @param value - Value.
 * @param uri - File URI where the value is defined.
 * @param range - Range of the value in the file.
 * @returns ValueWithOrigin node.
 */
export function createValue<T>(value: T, uri?: string, range?: Range): ValueWithOrigin<T> {
    const result: ValueWithOrigin<T> = {
        value
    };

    if (uri && range) {
        result.location = Location.create(uri, range);
    }

    return result;
}

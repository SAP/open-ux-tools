import type { Element, ElementName } from '@sap-ux/odata-annotation-core-types';
import { TEXT_TYPE, ELEMENT_TYPE, Edm } from '@sap-ux/odata-annotation-core-types';

import type { JsonPointer } from '../types';
import { expressionNames } from './expressions';

/*
  Fiori Annotation API uses paths (in JsonPointer format) to specify locations inside a (non embedded) annotation value.

  Annotation values are represented as in internal annotation file representation (Element, Attribute, TextNode) and
  paths therein use JsonPointer format.

  Remark: Internal representation of annotation value has more flexibility (choice between attribute and sub element notation)
  Hence - converting path to internal needs to have the actual internal representation.
  Also: error situations can occur in internal representation, which cannot be expressed in AVT format (e.g. multiple values for a PropertyValue)
 */

/**
 * Convert path in annotation to internal representation.
 *
 * @param annotation - Internal representation element.
 * @param pointer - path in external representation
 * @param valueType - Current value type
 * @returns Pointer to an internal representation node.
 */
export function convertPointerInAnnotationToInternal(
    annotation: Element,
    pointer: JsonPointer,
    valueType?: string
): JsonPointer {
    // e.g.
    // "/record/propertyValues/3/value/Collection/0/PropertyPath"
    // into "/content/0/content/3/content/0/content/0/text"
    // based on
    /*
    <Annotation Term="UI.Chart">
        <Record Type="UI.ChartDefinitionType">
            <PropertyValue Property="Title" String="Sales Data"/>
            <PropertyValue Property="Description" String="Sales"/>
            <PropertyValue Property="ChartType" EnumMember="UI.ChartType/Bar"/>
            <PropertyValue Property="Dimensions">
                <Collection>
                    <PropertyPath>Revenue</PropertyPath> // <<<====
    */
    let path: string[] = [''];
    const segments = pointer.split('/').filter((segment) => !!segment);
    let currentElement = annotation;
    let indexedSubElementName: string | undefined; // '' is valid value when looking for all sub element names
    segments.forEach((segment) => {
        if (!currentElement || !path) {
            // further path segments but no element to resolve it: error
            path = [];
            return;
        }
        let result: { subElement?: Element; subElementIndex: number } = { subElementIndex: -1 };
        switch (segment) {
            case 'annotations':
                // n'th Annotation sub element should represent n'th embedded annotation
                indexedSubElementName = Edm.Annotation;
                break;
            case 'record':
            case 'Record':
                // must be record sub element
                result = findSubElement(currentElement, Edm.Record, 0);
                break;
            case 'propertyValues':
                // n'th PropertyValue sub element should represent n'th entry in propertyValues
                indexedSubElementName = Edm.PropertyValue;
                break;
            case 'collection':
            case 'Collection':
                // just goto n'th subElement
                result = findSubElement(currentElement, Edm.Collection, 0);
                indexedSubElementName = '';
                break;
            case 'value':
                // if last segment: stay on current element, if further segments follow: they are handled in default
                path.push(...handleExpressionValueSegment(currentElement, valueType));
                break;
            case 'type':
                // type attribute in a Record
                path.push('attributes', 'Type', 'value');
                break;
            default:
                if (isNaN(Number(segment))) {
                    // segment is not an index
                    const { subElement, clearPath, pathSegments } = handleStringSegment(segment, currentElement);
                    result.subElement = subElement;
                    path = clearPath ? [] : [...path, ...(pathSegments ?? [])];
                } else if (indexedSubElementName !== null) {
                    // segment is an index - find sub element with specific name
                    result = findSubElement(currentElement, indexedSubElementName, Number(segment));
                    indexedSubElementName = undefined;
                }
                break;
        }
        if (result?.subElementIndex >= 0) {
            path.push('content', result.subElementIndex.toString());
        }
        if (result?.subElement) {
            currentElement = result.subElement;
        }
    });
    return path.join('/');
}

function handleExpressionValueSegment(currentElement: Element, valueType?: string): string[] {
    if (valueType === undefined) {
        return [];
    }
    if (currentElement.attributes[valueType]) {
        return ['attributes', valueType];
    }
    const elementIndex = currentElement.content.findIndex(
        (element) => element.type === ELEMENT_TYPE && element.name === valueType
    );
    if (elementIndex !== -1) {
        return ['content', elementIndex.toString()];
    }
    return [];
}

function handleStringSegment(
    segment: string,
    currentElement: Element
): { pathSegments?: string[]; subElement?: Element; clearPath?: boolean } {
    if (expressionNames[segment]) {
        // primitive type name; represented either as attribute or text sub node; should be the last segment
        return handleExpressionNameSegment(currentElement, segment);
    } else if (currentElement.attributes[firstCharToUpper(segment)]) {
        // can be qualifier, term, type: all are EDMX attribute names
        return { pathSegments: ['attributes', firstCharToUpper(segment), 'value'] };
    } else if (segment === 'name') {
        // propertyValue.name is value of EDMX attribute 'Property'
        return { pathSegments: ['attributes', Edm.Property, 'value'] };
    } else {
        return { clearPath: true };
    }
}

function handleExpressionNameSegment(
    currentElement: Element,
    segment: string
): { pathSegments?: string[]; subElement?: Element; clearPath?: boolean } {
    if (currentElement?.attributes[segment]) {
        // primitive type name represented as attribute
        return { pathSegments: ['attributes', segment, 'value'] };
    }
    if (currentElement.name === segment) {
        // point to first text node
        const firstTextNodeIndex = getFirstTextNodeIndex(currentElement);
        if (firstTextNodeIndex < 0) {
            return { clearPath: true };
        } else {
            return { pathSegments: ['content', firstTextNodeIndex.toString()] };
        }
    }
    // find sub node representing primitive value and point to it's first text node
    const { subElement, subElementIndex } = findSubElement(currentElement, segment, 0);
    if (subElementIndex < 0) {
        return { clearPath: true, subElement };
    }
    // subElementIndex found
    const pathSegments: string[] = ['content', subElementIndex.toString()];
    const firstTextNodeIndex = getFirstTextNodeIndex(currentElement.content[subElementIndex] as Element);
    if (firstTextNodeIndex < 0) {
        return { clearPath: true, subElement };
    }
    pathSegments.push('content', firstTextNodeIndex.toString());
    return { subElement, pathSegments };
}

function getFirstTextNodeIndex(element: Element): number {
    return element.content.findIndex((subNode) => subNode.type === TEXT_TYPE);
}

function findSubElement(
    element: Element,
    subElementName: ElementName | undefined,
    occurrence: number
): { subElement?: Element; subElementIndex: number } {
    const result: { subElement?: Element; subElementIndex: number } = {
        subElementIndex: -1
    };
    let currentMatchIndex = -1;
    for (let index = 0; index < element.content.length; index++) {
        const child = element.content[index];
        if (child.type === ELEMENT_TYPE && (!subElementName || child.name === subElementName)) {
            currentMatchIndex++;
            if (currentMatchIndex === occurrence) {
                result.subElement = child;
                result.subElementIndex = index;
            }
        }
    }
    return result;
}

function firstCharToUpper(source: string): string {
    let out: string = source;
    if (source) {
        out = source.slice(0, 1).toUpperCase() + source.slice(1);
    }
    return out;
}

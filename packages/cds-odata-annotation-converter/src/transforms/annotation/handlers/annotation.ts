import type { Annotation, AnnotationNode, Identifier } from '@sap-ux/cds-annotation-parser';
import { copyRange, ANNOTATION_TYPE, nodeRange, EMPTY_VALUE_TYPE } from '@sap-ux/cds-annotation-parser';

import type { Element } from '@sap-ux/odata-annotation-core-types';
import { Range, createElementNode, Edm, Position } from '@sap-ux/odata-annotation-core-types';
import { convertFlattenedPath } from '../flattened';

import type { ConvertResult, NodeHandler, Subtree } from '../handler';
import { getTerm } from '../type-resolver';
import type { VisitorState } from '../visitor-state';
import { createQualifierAttribute, createTermAttribute } from '../creators';

export const annotationHandler: NodeHandler<Annotation> = {
    type: ANNOTATION_TYPE,
    convert,
    getChildren(state: VisitorState, annotation: Annotation): AnnotationNode[] {
        if (annotation.value) {
            return [annotation.value];
        } else {
            return [];
        }
    }
};

/**
 * Converts an Annotation node into an Element node and handles flattened structures.
 *
 * @param state - The visitor state.
 * @param annotation - The Annotation node to convert.
 * @returns Returns an Element or Subtree representing the converted structure.
 */
function convert(state: VisitorState, annotation: Annotation): ConvertResult {
    const element: Element = createElementNode({
        name: Edm.Annotation,
        range: nodeRange(annotation, false)
    });

    const isEmbeddedAnnotation = state.elementStack.length > 0;
    const termSegments = getTermSegments(annotation, isEmbeddedAnnotation);

    const termName =
        state.context.groupName && !isEmbeddedAnnotation
            ? [state.context.groupName, ...termSegments.slice(0, 1)].join('.')
            : termSegments.slice(0, 2).join('.');

    element.attributes[Edm.Term] = createTermAttribute(
        termName,
        getTermNameRange(state, annotation, isEmbeddedAnnotation)
    );

    const [namespaceOrAlias, termSimpleIdentifier] = termName.split('.');
    const term = getTerm(state.vocabularyService, namespaceOrAlias, termSimpleIdentifier);
    if (isEmbeddedAnnotation) {
        state.pushContext({
            valueType: term?.type,
            termType: term?.type,
            isCollection: term?.isCollection
        });
    } else if (term) {
        state.pushContext({
            ...state.context,
            valueType: term?.type,
            termType: term.type,
            isCollection: term.isCollection
        });
    }

    if (annotation.qualifier) {
        element.attributes[Edm.Qualifier] = createQualifierAttribute(
            annotation.qualifier.value,
            nodeRange(annotation.qualifier, false)
        );
    }

    if (annotation.value) {
        element.contentRange = nodeRange(annotation.value, annotation.value.type !== EMPTY_VALUE_TYPE);
        // take into account colon
        if (annotation.colon && element.contentRange) {
            const colonPosition = annotation?.colon?.range?.end;
            // position right after colon should be counted as part of the elements content
            element.contentRange.start = colonPosition
                ? Position.create(colonPosition.line, colonPosition.character)
                : Position.create(0, 0);
        }
    }
    const flattenedSubtree = handleFlattenedStructure(state, annotation, element);

    if (flattenedSubtree) {
        return flattenedSubtree;
    }

    return element;
}

/**
 * Get the term segments from an annotation.
 *
 * @param annotation - The annotation object.
 * @param isEmbeddedAnnotation - A flag indicating whether the annotation is embedded.
 * @returns An array of string segments extracted from the annotation's term property.
 */
function getTermSegments(annotation: Annotation, isEmbeddedAnnotation: boolean): string[] {
    return annotation.term.segments.map((identifier, index) =>
        index === 0 && isEmbeddedAnnotation ? identifier.value.slice(1) : identifier.value
    );
}

/**
 * Gets the range for the term name based on the given annotation node and context.
 *
 * @param state - The visitor state.
 * @param node - The annotation node containing the term.
 * @param isEmbeddedAnnotation - Indicates whether the annotation is embedded within another element.
 * @returns Returns the range for the term name, or undefined if not applicable.
 */
function getTermNameRange(state: VisitorState, node: Annotation, isEmbeddedAnnotation: boolean): Range | undefined {
    const segments =
        state.context.groupName && !isEmbeddedAnnotation
            ? node.term.segments.slice(0, 1)
            : node.term.segments.slice(0, 2);

    if (segments.length === node.term.segments.length) {
        // use full node if it is a complete match and no flattened syntax is used
        return nodeRange(node.term, false);
    }
    const start = segments[0];
    const end = segments.slice(-1)[0];
    if (!start || !end) {
        return undefined;
    }
    const startPosition = nodeRange(start, false)?.start;
    const endPosition = nodeRange(end, false)?.end;
    if (!startPosition || !endPosition) {
        return undefined;
    }
    return Range.create(startPosition, endPosition);
}

/**
 * Gets the flattened segments from the term of the given annotation, considering the context and nesting.
 *
 * @param state - The visitor state.
 * @param annotation - The annotation containing the term with segments.
 * @returns Returns the flattened segments of the term.
 */
function getFlattenedSegments(state: VisitorState, annotation: Annotation): Identifier[] {
    const isEmbeddedAnnotation = state.elementStack.length > 0;
    const trailingTermSegmentStart = state.context.groupName && !isEmbeddedAnnotation ? 1 : 2;
    return annotation.term.segments.slice(trailingTermSegmentStart);
}

/**
 * Handles a flattened structure in the CDS syntax and builds nested structures.
 *
 * @param state - The visitor state.
 * @param annotation - The annotation containing the flattened structure.
 * @param element - The element to which the flattened structure will be added.
 * @returns Returns a Subtree representing the nested structures, or undefined if not applicable.
 */
function handleFlattenedStructure(state: VisitorState, annotation: Annotation, element: Element): Subtree | undefined {
    // Build nested structures for CDS flattened syntax
    // e.g UI.Chart.AxisScaling.ScaleBehavior : #AutoScale, @Common.Text.@UI.TextArrangement : #TextFirst
    const flattenedSegments = getFlattenedSegments(state, annotation);

    if (flattenedSegments.length) {
        const subtree = convertFlattenedPath(state, flattenedSegments, annotation.value);
        if (subtree) {
            const range = subtree.root.range ? copyRange(subtree.root.range) : undefined;
            if (subtree.root.name === Edm.PropertyValue) {
                const record = createElementNode({
                    name: Edm.Record,
                    range,
                    contentRange: range
                });
                record.content.push(subtree.root);
                element.content.push(record);
            } else {
                element.content.push(subtree.root);
            }

            element.contentRange = range ? copyRange(range) : undefined;

            return {
                root: element,
                leaf: subtree.leaf
            };
        }
    }
    return undefined;
}

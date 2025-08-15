import type { Annotation, AnnotationNode, Identifier } from '@sap-ux/cds-annotation-parser';
import {
    copyRange,
    ANNOTATION_TYPE,
    nodeRange,
    EMPTY_VALUE_TYPE,
    ReservedProperties
} from '@sap-ux/cds-annotation-parser';

import type { Element } from '@sap-ux/odata-annotation-core-types';
import { Range, createElementNode, Edm, Position } from '@sap-ux/odata-annotation-core-types';

import type { ConvertResult, NodeHandler, Subtree } from '../handler';
import { getTerm } from '../type-resolver';
import type { VisitorState } from '../visitor-state';
import { createQualifierAttribute, createTermAttribute } from '../creators';

export const annotationHandler: NodeHandler<Annotation> = {
    type: ANNOTATION_TYPE,
    convert,
    getChildren(state: VisitorState, annotation: Annotation): AnnotationNode[] {
        if (!annotation.term.segments.find((item) => item.value === ReservedProperties.Type) && annotation.value) {
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

    const parsedTermName = praseTermName(state.context.groupName, annotation, isEmbeddedAnnotation);

    element.attributes[Edm.Term] = createTermAttribute(
        parsedTermName.qualifiedName,
        getTermNameRange(state, annotation, isEmbeddedAnnotation, parsedTermName)
    );
    if (parsedTermName.qualifier) {
        element.attributes[Edm.Qualifier] = createQualifierAttribute(
            parsedTermName.qualifier,
            parsedTermName.qualifierRange
        );
    }

    const [namespaceOrAlias, termSimpleIdentifier] = parsedTermName.qualifiedName.split('.');
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

    if (!parsedTermName.qualifier && annotation.qualifier) {
        // TODO: check all variations
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
    // const flattenedSubtree = handleFlattenedStructure(state, annotation, element);

    // if (flattenedSubtree) {
    //     return flattenedSubtree;
    // }

    return element;
}

interface ParsedTermName {
    qualifiedName: string;
    termNameRange?: Range;
    qualifier?: string;
    qualifierRange?: Range;
}

function praseTermName(
    groupName: string | undefined,
    annotation: Annotation,
    isEmbeddedAnnotation: boolean
): ParsedTermName {
    const termSegments = annotation.term.segments;
    // const termSegments = getTermSegments(annotation, isEmbeddedAnnotation);
    if (groupName && !isEmbeddedAnnotation) {
        return pp(groupName, termSegments[0]);
    } else {
        if (termSegments.length < 2) {
            // if term segments are less than 2, we can't parse it as a term
            console.log(termSegments);

            return pp('', termSegments[0]);
        }
        return pp(termSegments[0].value, termSegments[1], termSegments[0].range?.start);
    }
}

function pp(namespace: string | undefined, identifier: Identifier, namespaceStart?: Position): ParsedTermName {
    const [term, qualifier] = identifier.value.split('#');
    const segmentRange = nodeRange(identifier, false);
    const termNameRange =
        namespaceStart && segmentRange ? Range.create(namespaceStart, segmentRange.end) : segmentRange;
    if (namespace?.startsWith('@')) {
        namespace = namespace.substring(1);
        if (termNameRange) {
            // termNameRange.start.character += 1; // remove @ from the start of the name
        }
    }
    const nameSegments = [];
    if (namespace) {
        nameSegments.push(namespace);
    }
    nameSegments.push(term);
    const qualifiedName = nameSegments.join('.');
    const parsedTermName: ParsedTermName = {
        qualifiedName,
        termNameRange
    };
    // console.log(parsedTermName);
    if (qualifier) {
        parsedTermName.qualifier = qualifier;
        const qualifierRange = nodeRange(identifier, false);
        if (qualifierRange) {
            qualifierRange.start.character += term.length + 1; // +1 for the #
            parsedTermName.qualifierRange = qualifierRange;
        }
    }

    return parsedTermName;
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
 * @param parsedTermName - The parsed term name containing the qualified name and segments.
 * @returns Returns the range for the term name, or undefined if not applicable.
 */
function getTermNameRange(
    state: VisitorState,
    node: Annotation,
    isEmbeddedAnnotation: boolean,
    parsedTermName: ParsedTermName
): Range | undefined {
    const segments =
        state.context.groupName && !isEmbeddedAnnotation
            ? node.term.segments.slice(0, 1)
            : node.term.segments.slice(0, 2);

    if (segments.length === node.term.segments.length) {
        // use full node if it is a complete match and no flattened syntax is used
        return nodeRange(node.term, false);
    }
    return parsedTermName.termNameRange;
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


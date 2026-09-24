import type { Annotation, AnnotationNode } from '@sap-ux/cds-annotation-parser';
import { ANNOTATION_TYPE, nodeRange, EMPTY_VALUE_TYPE, ReservedProperties } from '@sap-ux/cds-annotation-parser';

import type { Element, Range } from '@sap-ux/odata-annotation-core-types';
import { createElementNode, Edm, Position } from '@sap-ux/odata-annotation-core-types';

import type { ConvertResult, NodeHandler } from '../handler.js';
import { getTerm } from '../type-resolver.js';
import type { VisitorState } from '../visitor-state.js';
import { createQualifierAttribute, createTermAttribute } from '../creators.js';

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

    const namespace = isEmbeddedAnnotation ? undefined : state.context.groupName;
    let qualifiedName = ((namespace ? namespace + '.' : '') + annotation.term.value).split('#')[0];
    if (qualifiedName.startsWith('@')) {
        qualifiedName = qualifiedName.slice(1);
    }
    const parsedTermName: ParsedTermName = {
        qualifiedName,
        termNameRange: annotation.term.range,
        qualifier: annotation.qualifier?.value,
        qualifierRange: annotation.qualifier?.range
    };

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
    return element;
}

interface ParsedTermName {
    qualifiedName: string;
    termNameRange?: Range;
    qualifier?: string;
    qualifierRange?: Range;
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

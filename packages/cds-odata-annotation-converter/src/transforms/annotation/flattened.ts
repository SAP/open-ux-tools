import type {
    AnnotationValue,
    StringLiteral,
    Annotation,
    FlattenedPathSegment,
    FlattenedPropertySegment,
    FlattenedExpression
} from '@sap-ux/cds-annotation-parser';
import {
    FLATTENED_ANNOTATION_SEGMENT_TYPE,
    FLATTENED_PROPERTY_SEGMENT_TYPE,
    nodeRange,
    ReservedProperties,
    STRING_LITERAL_TYPE
} from '@sap-ux/cds-annotation-parser';

import type { Element, Range } from '@sap-ux/odata-annotation-core';
import { DiagnosticSeverity, Edm, createAttributeNode, createElementNode } from '@sap-ux/odata-annotation-core';

import type { Subtree } from './handler';

import { createPropertyAttribute, createQualifierAttribute, createTermAttribute } from './creators';
import { getPropertyType, getTerm } from './type-resolver';

import type { Context, VisitorState } from './visitor-state';
import { copyRange, createRange } from './range';
import type { ComplexTypeProperty, Term } from '@sap-ux/odata-vocabularies';
import { i18n } from '../../i18n';

/**
 * Builds a tree from a flattened annotation structure and updates context with the final value type.
 *
 * @param state VisitorSate for which context will be updated with the inferred value types.
 * @param expression FlattenedExpression AST node.
 * @param value annotation value.
 * @returns subtree representing flattened structure
 */
export function convertFlattenedPath(
    state: VisitorState,
    expression: FlattenedExpression,
    value: AnnotationValue | undefined
): Subtree | undefined {
    // |________________Annotation____________________|
    // |         |                                    |
    // |         |___________Record(root)_____________|
    // |         |                                    |
    // |         |__________Property Value____________|
    // |         |                                    |
    // |         |           |________Record__________|
    // |         |           |                        |
    // |         |           |_____Property Value_____|
    // |         |           |                        |
    // |         |           |                        |
    //  UI.Chart.AxisScaling.ScaleBehavior : #AutoScale
    //  \______/|\_________/|\___________/   \________/
    //     |    |     |     |     |              |
    //     |    |     |     |     |              |
    //     |  Record  |   Record  |              |
    //     |          |           |              |
    //    Term        |           |              |
    //             Property    Property      Enum Member
    let root: Element | undefined;
    let parent: Element | undefined;
    // console.log(segments);
    const expandedStructures = convertToExpandedStructure(state, expression, value);
    console.log(
        expandedStructures.length,
        expression.path.segments.map((x) => (x.type === 'flattened-annotation-segment' ? x.term : x.name))
    );
    // console.log(expandedStructures);
    if (!expandedStructures.length) {
        return;
    }
    // const last = expandedStructures[expandedStructures.length - 1];
    // if (last.kind === 'annotation' && annotation?.qualifier) {
    //     // last qualifier is parsed in annotation AST node and we need to attach it to the last flattened annotation
    //     last.element.attributes[Edm.Qualifier] = createQualifierAttribute(
    //         annotation.qualifier.value,
    //         nodeRange(annotation.qualifier, false)
    //     );
    // }
    for (const expandedStructure of expandedStructures) {
        if (parent) {
            if (expandedStructure.kind === 'record-type' || expandedStructure.kind === 'annotation') {
                if (expandedStructure.element.range) {
                    parent.contentRange = copyRange(expandedStructure.element.range);
                }
                parent.content.push(expandedStructure.element);
            } else {
                const record: Element = createElementNode({
                    name: Edm.Record,
                    range: expandedStructure.element.range ?? undefined,
                    content: [expandedStructure.element],
                    contentRange: expandedStructure.element.range ?? undefined
                });
                // property content range should include only child range
                parent.contentRange = record.range ?? undefined;
                parent.content.push(record);
            }
        } else {
            root = expandedStructure.element;
        }
        parent = expandedStructure.element;
    }

    state.pushContext({ ...state.context, ...createNewContext(expandedStructures) });

    if (!root || !parent) {
        return;
    }

    return {
        root,
        leaf: parent
    };
}

interface ExpandedStructure {
    kind: 'annotation' | 'property' | 'record-type';
    name: string;
    element: Element;
    vocabularyObject?: Term | ComplexTypeProperty;
}

/**
 * Creates a new context.
 *
 * @param expandedStructures expanded structure either annotation or property kind.
 * @returns new context
 */
function createNewContext(expandedStructures: ExpandedStructure[]): Context {
    const last = expandedStructures[expandedStructures.length - 1];
    const newContext: Context = {
        valueType: last.vocabularyObject?.type,
        isCollection: last.vocabularyObject?.isCollection
    };

    if (last.kind === 'annotation') {
        newContext.termType = last.vocabularyObject?.type;
    } else if (last.kind === 'record-type') {
        newContext.recordType = last.element.attributes[Edm.Type].value;
    } else {
        newContext.propertyName = last.element.attributes[Edm.Property].value;
    }

    return newContext;
}

/**
 * Converts segments to expanded structure.
 *
 * @param state VisitorSate for which context will be updated with the inferred value types.
 * @param expression FlattenedExpression AST node.
 * @param value AnnotationValue
 * @returns expanded structure either annotation or property kind.
 */
function convertToExpandedStructure(
    state: VisitorState,
    expression: FlattenedExpression,
    value: AnnotationValue | undefined
): ExpandedStructure[] {
    const valueRange = value?.range;
    const expandedStructure: ExpandedStructure[] = [];
    const initialType = state.context.recordType ?? state.context.termType;
    const segments = expression.path.segments;
    const lastSegment = valueRange ? undefined : segments[segments.length - 1];
    let i = 0;
    while (i < segments.length) {
        const segment = segments[i];
        const propertyRange = createRange(segment.range?.start, valueRange?.end ?? lastSegment?.range?.end);

        if (segment.type === FLATTENED_ANNOTATION_SEGMENT_TYPE) {
            // handle embedded annotation syntax (supported starting with cds-compiler v3)
            // e.g. @Common.Text.@UI.TextArrangement : #TextFirst
            const vocabulary = segment.vocabulary?.value ?? state.context.groupName;
            if (!vocabulary) {
                console.warn(`No vocabulary found for segment: ${segment.term.value}. This should not happen.`);
                i++;
                continue;
            }
            const termName = vocabulary ? `${vocabulary}.${segment.term.value}` : segment.term.value;
            const termValueRange = createRange(segment.range?.start, segment.term.range?.end);
            console.log(vocabulary, termName);

            const embeddedAnnotation = createElementNode({
                name: Edm.Annotation,
                range: propertyRange,
                attributes: {
                    [Edm.Term]: createTermAttribute(termName, termValueRange)
                },
                content: []
            });

            if (segment.qualifier) {
                embeddedAnnotation.attributes[Edm.Qualifier] = createQualifierAttribute(
                    segment.qualifier.value,
                    segment.qualifier.range
                );
            }

            expandedStructure.push({
                kind: 'annotation',
                name: termName,
                vocabularyObject: getTerm(state.vocabularyService, vocabulary, segment.term.value),
                element: embeddedAnnotation
            });
        } else if (segment.type === FLATTENED_PROPERTY_SEGMENT_TYPE) {
            if (segment.name.value === ReservedProperties.Type) {
                const hasSegmentAhead = segments[i + 1];
                if (hasSegmentAhead) {
                    addDiagnosticForSegmentAfterType(state, segments.slice(i + 1), valueRange);
                    break;
                }
                createRecordTypeAttribute(state, expandedStructure, segment, value, propertyRange);
            } else {
                const flatProperty: Element = createElementNode({
                    name: Edm.PropertyValue,
                    range: propertyRange,
                    contentRange: propertyRange,
                    attributes: {
                        [Edm.Property]: createPropertyAttribute(segment.name.value, segment.range)
                    }
                });

                const parentType =
                    expandedStructure[expandedStructure.length - 1]?.vocabularyObject?.type ?? initialType;
                expandedStructure.push({
                    kind: 'property',
                    name: segment.name.value,
                    vocabularyObject: getPropertyType(state.vocabularyService, parentType, segment.name.value),
                    element: flatProperty
                });
            }
        }
        i++;
    }
    adjustFirstSegmentRange(expandedStructure, expression);
    adjustLastSegmentRange(expandedStructure, valueRange);

    return expandedStructure;
}

/**
 * Adjusts the first segment range of the expanded structure.
 *
 * @param expandedStructure expanded structure either annotation or property kind.
 * @param expression FlattenedExpression AST node.
 */
function adjustFirstSegmentRange(expandedStructure: ExpandedStructure[], expression: FlattenedExpression): void {
    // the leaf element should only include the values range in it's contentRange
    const first = expandedStructure[0];
    if (first) {
        first.element.range = copyRange(expression.range);
    }
}

/**
 * Adjusts the last segment range of the expanded structure.
 *
 * @param expandedStructure expanded structure either annotation or property kind.
 * @param valueRange Value range
 */
function adjustLastSegmentRange(expandedStructure: ExpandedStructure[], valueRange?: Range): void {
    // the leaf element should only include the values range in it's contentRange
    const last = expandedStructure[expandedStructure.length - 1];
    if (last) {
        if (valueRange && last.kind !== 'record-type') {
            last.element.contentRange = copyRange(valueRange);
        } else {
            // content range should not be added in case value does not exist
            // e.g  { AxisScaling. }
            delete last.element.contentRange;
        }
    }
}

/**
 * Adds a diagnostic for segments after $Type.
 *
 * @param state VisitorSate for which context will be updated with the inferred value types.
 * @param segments Array of identifiers representing flattened record structure.
 * @param valueRange value range
 */
function addDiagnosticForSegmentAfterType(
    state: VisitorState,
    segments: FlattenedPathSegment[],
    valueRange?: Range
): void {
    if (segments.length >= 1) {
        const message = i18n.t('No_segments_after_type');
        const lastSegment = segments[segments.length - 1];
        const propertyRange = createRange(segments[0].range?.start, valueRange?.end ?? lastSegment?.range?.end);
        if (propertyRange) {
            state.addDiagnostic({
                range: propertyRange,
                severity: DiagnosticSeverity.Error,
                message
            });
        }
    }
}
/**
 * Adds a diagnostic for non-string literal type and no value scenarios.
 *
 * @param state VisitorSate for which context will be updated with the inferred value types.
 * @param value AnnotationValue
 * @param segmentRange segment range
 */
function addDiagnosticForNonStringLiteralType(
    state: VisitorState,
    value?: AnnotationValue,
    segmentRange?: Range
): void {
    if (value?.type !== STRING_LITERAL_TYPE && value?.range) {
        const message = i18n.t('Type_value_must_be_string');
        state.addDiagnostic({
            range: value.range,
            severity: DiagnosticSeverity.Error,
            message
        });
    } else if (!value && segmentRange) {
        state.addDiagnostic({
            range: segmentRange,
            severity: DiagnosticSeverity.Error,
            message: i18n.t('Value_must_be_provided')
        });
    }
}

/**
 * Add record's type to the expanded structure.
 *
 * @param state VisitorSate for which context will be updated with the inferred value types.
 * @param expandedStructures expanded structure either annotation or property kind.
 * @param segment Identifiers representing flattened record structure.
 * @param value AnnotationValue
 * @param propertyRange Range
 */
function createRecordTypeAttribute(
    state: VisitorState,
    expandedStructures: ExpandedStructure[],
    segment: FlattenedPropertySegment,
    value?: AnnotationValue,
    propertyRange?: Range
): void {
    if (value?.type === STRING_LITERAL_TYPE) {
        const flatProperty: Element = createElementNode({
            name: Edm.Record,
            attributes: {
                [Edm.Type]: createAttributeNode(
                    Edm.Type,
                    (value as StringLiteral)?.value,
                    segment.range,
                    nodeRange(value, false)
                )
            },
            range: propertyRange
        });

        expandedStructures.push({
            kind: 'record-type',
            name: segment.name.value,
            element: flatProperty
        });
        return;
    }
    addDiagnosticForNonStringLiteralType(state, value, segment.range);
}

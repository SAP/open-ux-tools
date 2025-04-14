import type { Identifier, AnnotationValue, StringLiteral } from '@sap-ux/cds-annotation-parser';
import { nodeRange, ReservedProperties, STRING_LITERAL_TYPE } from '@sap-ux/cds-annotation-parser';

import type { Element, Range } from '@sap-ux/odata-annotation-core';
import { DiagnosticSeverity, Edm, createAttributeNode, createElementNode } from '@sap-ux/odata-annotation-core';

import type { Subtree } from './handler';

import { createPropertyAttribute, createTermAttribute } from './creators';
import { getPropertyType, getTerm } from './type-resolver';

import type { Context, VisitorState } from './visitor-state';
import { copyRange, createRange } from './range';
import type { ComplexTypeProperty, Term } from '@sap-ux/odata-vocabularies';
import { i18n } from '../../i18n';

/**
 * Builds a tree from a flattened annotation structure and updates context with the final value type.
 *
 * @param state VisitorSate for which context will be updated with the inferred value types.
 * @param segments Array of identifiers representing flattened record structure.
 * @param value annotation value.
 * @returns subtree representing flattened structure
 */
export function convertFlattenedPath(
    state: VisitorState,
    segments: Identifier[],
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
    const expandedStructures = convertToExpandedStructure(state, segments, value);
    if (!expandedStructures.length) {
        return;
    }

    for (const expandedStructure of expandedStructures) {
        if (!parent) {
            root = expandedStructure.element;
            parent = expandedStructure.element;
            continue;
        }
        if (expandedStructure.kind === 'record-type') {
            parent.contentRange = copyRange(expandedStructure?.element?.range) ?? parent.contentRange;
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
        parent = expandedStructure.element;
    }

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

    state.pushContext({ ...state.context, ...newContext });

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
 *
 * @param state VisitorSate for which context will be updated with the inferred value types.
 * @param segments Array of identifiers representing flattened record structure.
 * @param value AnnotationValue
 * @returns expanded structure either annotation or property kind.
 */
function convertToExpandedStructure(
    state: VisitorState,
    segments: Identifier[],
    value: AnnotationValue | undefined
): ExpandedStructure[] {
    const valueRange = value?.range;
    const expandedStructure: ExpandedStructure[] = [];
    const initialType = state.context.recordType ?? state.context.termType;
    const lastSegment = valueRange ? undefined : segments[segments.length - 1];
    let i = 0;
    while (i < segments.length) {
        const segment = segments[i];
        const propertyRange = createRange(segment.range?.start, valueRange?.end ?? lastSegment?.range?.end);

        if (segment.value.startsWith('@')) {
            // handle embedded annotation syntax (supported starting with cds-compiler v3)
            // e.g. @Common.Text.@UI.TextArrangement : #TextFirst
            const vocabularyNameOrAlias = segment.value.substring(1);
            const termNameSegment = segments[i + 1];

            const termQualifiedName = termNameSegment
                ? `${vocabularyNameOrAlias}.${termNameSegment.value}`
                : vocabularyNameOrAlias;
            const termValueRange = createRange(segment.range?.start, termNameSegment.range?.end);

            const embeddedAnnotation = createElementNode({
                name: Edm.Annotation,
                range: propertyRange,
                attributes: {
                    [Edm.Term]: createTermAttribute(termQualifiedName, termValueRange)
                },
                content: []
            });

            expandedStructure.push({
                kind: 'annotation',
                name: termQualifiedName,
                vocabularyObject: getTerm(state.vocabularyService, vocabularyNameOrAlias, termNameSegment.value),
                element: embeddedAnnotation
            });
            i += 2;
            continue;
        }
        if (segment.value === ReservedProperties.Type) {
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
                expandedStructure.push({
                    kind: 'record-type',
                    name: segment.value,
                    element: flatProperty
                });
            }
            const hasSegmentAhead = segments[i + 1];
            if (hasSegmentAhead) {
                addDiagnosticForSegmentAfterType(state, segments.slice(i + 1), valueRange);
                break;
            }
            addDiagnosticForNonStringLiteralType(state, value, segment.range);
        } else {
            const flatProperty: Element = createElementNode({
                name: Edm.PropertyValue,
                range: propertyRange,
                contentRange: propertyRange,
                attributes: {
                    [Edm.Property]: createPropertyAttribute(segment.value, segment.range)
                }
            });

            const parentType = expandedStructure[expandedStructure.length - 1]?.vocabularyObject?.type ?? initialType;
            expandedStructure.push({
                kind: 'property',
                name: segment.value,
                vocabularyObject: getPropertyType(state.vocabularyService, parentType, segment.value),
                element: flatProperty
            });
        }
        i++;
    }

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

    return expandedStructure;
}

/**
 *
 * @param state VisitorSate for which context will be updated with the inferred value types.
 * @param segments Array of identifiers representing flattened record structure.
 * @param valueRange value range
 */
function addDiagnosticForSegmentAfterType(state: VisitorState, segments: Identifier[], valueRange?: Range): void {
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

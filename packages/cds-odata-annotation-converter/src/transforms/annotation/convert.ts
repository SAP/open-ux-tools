import type { Assignment } from '@sap-ux/cds-annotation-parser';
import type { Diagnostic, Element, PositionPointer, Range } from '@sap-ux/odata-annotation-core-types';

import { VisitorState } from './visitor-state';
import { visitor } from './visitor';
import type { ToTermsOptions } from '../types';
import { findNode } from './find-node';

export interface AnnotationConversionResult {
    terms: Element[];
    pointer?: PositionPointer;
    /**
     * most specific range containing the position: will be build up during transform if position is present
     */
    nodeRange?: Range;
    /**
     * set of relative (to target base) metadata paths (CDS syntax) occurring in annotation values
     */
    pathSet?: Set<string>;
    diagnostics: Diagnostic[];
}

/**
 * Converts CDS annotation AST nodes to the generic annotation format.
 *
 * @param assignment Annotation assignment node
 * @param options Term options e.g. position
 * @returns converted annotation which contain information of terms, diagnostics position.
 */
export function convertAnnotation(assignment: Assignment, options: ToTermsOptions): AnnotationConversionResult {
    const state = new VisitorState(options.vocabularyService);
    if (options.position) {
        state.position = options.position;
    }
    const terms: Element[] = [];

    if (assignment.type === 'annotation-group') {
        state.pushContext({
            groupName: assignment.name.value
        });
    }
    const nodes = assignment.type === 'annotation' ? [assignment] : assignment.items.items;

    for (const item of nodes) {
        const context = { ...state.context };
        const element = visitor.visit(state, item);
        state.pushContext(context);
        if (element) {
            terms.push(element);
        }
    }

    const result: AnnotationConversionResult = {
        terms,
        diagnostics: state.diagnostics,
        pathSet: state.pathSet
    };

    const match = options.position ? findNode(assignment, terms, options.position) : undefined;

    if (match) {
        result.pointer = match.pointer;
        result.nodeRange = match.range;
    }

    return result;
}

import type { VisitTraversalStep } from '@eslint/plugin-kit';
import { VisitNodeStep } from '@eslint/plugin-kit';
import type { AnyNode } from '@sap-ux/odata-annotation-core';

export const STEP_PHASE: {
    ENTER: 1;
    EXIT: 2;
} = {
    ENTER: 1,
    EXIT: 2
};

interface VisitNodeStepConstructorParams {
    target: AnyNode;
    phase: 1 | 2;
    args: any[];
}

export interface AnnotationTraversalStep extends VisitTraversalStep {
    target: AnyNode;
}

/**
 * XML Traversal Step Class
 */
export class AnnotationVisitNodeStep extends VisitNodeStep implements AnnotationTraversalStep {
    declare target: AnyNode;
    /**
     * Constructor.
     *
     * @param params - Parameters
     */
    constructor(params: VisitNodeStepConstructorParams) {
        super(params);
    }
}

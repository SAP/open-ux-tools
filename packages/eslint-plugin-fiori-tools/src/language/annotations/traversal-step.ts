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

/**
 * XML Traversal Step Class
 */
export class AnnotationTraversalStep extends VisitNodeStep {
    /**
     * Constructor.
     *
     * @param params - Parameters
     */
    constructor(params: VisitNodeStepConstructorParams) {
        super(params);
        // this.target = target;
    }
}

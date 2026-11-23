import type { VisitTraversalStep } from '@eslint/plugin-kit';
import { VisitNodeStep } from '@eslint/plugin-kit';
import type { I18nNode } from './source-code.js';

export const STEP_PHASE: {
    ENTER: 1;
    EXIT: 2;
} = {
    ENTER: 1,
    EXIT: 2
};

interface VisitNodeStepConstructorParams {
    target: I18nNode;
    phase: 1 | 2;
    args: unknown[];
}

export interface I18nTraversalStep extends VisitTraversalStep {
    target: I18nNode;
}

/**
 * i18n Traversal Step class used to walk the I18nDocument AST.
 */
export class I18nVisitNodeStep extends VisitNodeStep implements I18nTraversalStep {
    declare target: I18nNode;
    /**
     * Constructor.
     *
     * @param params - Parameters
     */
    constructor(params: VisitNodeStepConstructorParams) {
        super(params);
    }
}

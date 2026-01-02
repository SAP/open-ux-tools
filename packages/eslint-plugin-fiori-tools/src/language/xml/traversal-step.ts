import type { VisitTraversalStep } from '@eslint/plugin-kit';
import { VisitNodeStep } from '@eslint/plugin-kit';
import type { XMLAstNode, XMLToken } from '@xml-tools/ast';

export const STEP_PHASE: {
    ENTER: 1;
    EXIT: 2;
} = {
    ENTER: 1,
    EXIT: 2
};

interface VisitNodeStepConstructorParams {
    target: XMLAstNode | XMLToken;
    phase: 1 | 2;
    args: any[];
}

export interface XMLVisitTraversalStep extends VisitTraversalStep {
    target: XMLAstNode | XMLToken;
}

/**
 * XML Traversal Step Class
 */
export class XMLVisitNodeStep extends VisitNodeStep implements XMLVisitTraversalStep {
    declare target: XMLAstNode | XMLToken;

    /**
     * Constructor.
     *
     * @param params - Parameters
     */
    constructor(params: VisitNodeStepConstructorParams) {
        super(params);
    }
}

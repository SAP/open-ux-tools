import type { XMLAstNode, XMLDocument, XMLToken } from '@xml-tools/ast';
import { buildAst } from '@xml-tools/ast';
import type { DocumentCstNode } from '@xml-tools/parser';
import { parse } from '@xml-tools/parser';

import type { ProjectContext } from '../../../src/project-context/project-context';
import { FioriXMLSourceCode } from '../../../src/language/xml/source-code';
import { STEP_PHASE } from '../../../src/language/xml/traversal-step';

function getAst(text: string): XMLDocument {
    const { cst, tokenVector } = parse(text);
    return buildAst(cst as DocumentCstNode, tokenVector);
}

function isNode(node: XMLAstNode | XMLToken): node is XMLAstNode {
    return 'type' in node;
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const DUMMY_PROJECT_CONTEXT: ProjectContext = {} as any;

describe('FioriXMLSourceCode', () => {
    it('should create an instance correctly', () => {
        const xmlText = `<root><child attr="value">Text</child></root>`;
        const ast = getAst(xmlText);
        const sourceCode = new FioriXMLSourceCode({
            text: xmlText,
            ast,
            projectContext: DUMMY_PROJECT_CONTEXT
        });

        expect(sourceCode.text).toBe(xmlText);
        expect(sourceCode.ast).toBe(ast);
    });

    it('should traverse the XML AST correctly', () => {
        const xmlText = `<root><child attr="value">Text</child></root>`;
        const ast = getAst(xmlText);
        const sourceCode = new FioriXMLSourceCode({
            text: xmlText,
            ast,
            projectContext: DUMMY_PROJECT_CONTEXT
        });

        const traversalSteps = Array.from(sourceCode.traverse());

        const expectedNodeTypes = ['XMLDocument', 'XMLElement', 'XMLElement', 'XMLAttribute', 'XMLTextContent'];

        const traversedNodeTypes = traversalSteps
            .filter((step) => step.phase === STEP_PHASE.ENTER)
            .map((step) => (isNode(step.target) ? step.target.type : step.target.image));

        expect(traversedNodeTypes).toEqual(expectedNodeTypes);
    });
});

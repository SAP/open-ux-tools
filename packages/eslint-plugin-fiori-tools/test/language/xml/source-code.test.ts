import { jest } from '@jest/globals';
import type { XMLAstNode, XMLDocument, XMLToken } from '@xml-tools/ast';
import { buildAst } from '@xml-tools/ast';
import type { DocumentCstNode } from '@xml-tools/parser';
import type { ProjectContext } from '../../../src/project-context/project-context.js';
import { parse } from '@xml-tools/parser';
import { FioriXMLSourceCode } from '../../../src/language/xml/source-code.js';
import { STEP_PHASE } from '../../../src/language/xml/traversal-step.js';
import { normalizePath } from '@sap-ux/project-access';
import type { FioriLanguage as FioriLanguageType } from '../../../src/language/fiori-language.js';

const xmlParseMock = jest.fn((...args: Parameters<typeof parse>) => parse(...args));
const updateFileMock = jest.fn().mockReturnValue({ index: { documents: {} } });
jest.unstable_mockModule('@xml-tools/parser', () => ({
    parse: xmlParseMock
}));
jest.unstable_mockModule('../../../src/project-context/project-context.js', () => ({
    ProjectContext: {
        updateFile: updateFileMock
    }
}));

let FioriLanguage: new () => FioriLanguageType;

beforeAll(async () => {
    ({ FioriLanguage } = await import('../../../src/language/fiori-language.js'));
});

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

    it('should provide location for nodes', () => {
        const xmlText = `<root><child attr="value">Text</child></root>`;
        const ast = getAst(xmlText);
        const sourceCode = new FioriXMLSourceCode({
            text: xmlText,
            ast,
            projectContext: DUMMY_PROJECT_CONTEXT
        });

        expect(sourceCode.getLoc(ast.rootElement!)).toMatchSnapshot();
    });

    it('should provide location for tokens', () => {
        const xmlText = `<root><child attr="value">Text</child></root>`;
        const ast = getAst(xmlText);
        const sourceCode = new FioriXMLSourceCode({
            text: xmlText,
            ast,
            projectContext: DUMMY_PROJECT_CONTEXT
        });

        expect(sourceCode.getLoc(ast.rootElement!.syntax.openName!)).toMatchSnapshot();
    });

    it('should provide parent for nodes', () => {
        const xmlText = `<root><child attr="value">Text</child></root>`;
        const ast = getAst(xmlText);
        const sourceCode = new FioriXMLSourceCode({
            text: xmlText,
            ast,
            projectContext: DUMMY_PROJECT_CONTEXT
        });

        expect(sourceCode.getParent(ast.rootElement!)?.type).toStrictEqual('XMLDocument');
    });

    it('parent should be undefined for document node', () => {
        const xmlText = `<root><child attr="value">Text</child></root>`;
        const ast = getAst(xmlText);
        const sourceCode = new FioriXMLSourceCode({
            text: xmlText,
            ast,
            projectContext: DUMMY_PROJECT_CONTEXT
        });

        expect(sourceCode.getParent(ast)).toStrictEqual(undefined);
    });

    it('parent should be undefined for tokens', () => {
        const xmlText = `<root><child attr="value">Text</child></root>`;
        const ast = getAst(xmlText);
        const sourceCode = new FioriXMLSourceCode({
            text: xmlText,
            ast,
            projectContext: DUMMY_PROJECT_CONTEXT
        });

        expect(sourceCode.getParent(ast.rootElement!.syntax.openName!)).toStrictEqual(undefined);
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

    it('should return parsing error for .xml file', async () => {
        const fioriLanguage = new FioriLanguage();
        const result = fioriLanguage.parse(
            { path: 'dummy.xml', body: 'test', physicalPath: 'dummy.xml', bom: false },
            { LangOptions: {} }
        );
        expect(result.ok).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].message).toBe(
            `Failed to parse XML file ${normalizePath('dummy.xml')}: Expecting token of type --> OPEN <-- but found --> 'test' <--`
        );
    });

    it('should parse .xml file correctly, skip parsing if cached', async () => {
        xmlParseMock.mockClear();
        const fioriLanguage = new FioriLanguage();
        const xmlContent = '<test></test>';
        let result = fioriLanguage.parse(
            { path: 'dummy.xml', body: xmlContent, physicalPath: 'dummy.xml', bom: false },
            { LangOptions: {} }
        );
        expect(result.ok).toBe(true);
        expect(result.errors).toBeUndefined();
        expect(xmlParseMock).toHaveBeenCalledWith(xmlContent);

        const capturedUri = updateFileMock.mock.calls[0][0] as string;
        updateFileMock.mockReturnValueOnce({
            index: { documents: { [capturedUri]: { type: 'XMLDocument' } } }
        });
        result = fioriLanguage.parse(
            { path: 'dummy.xml', body: xmlContent, physicalPath: 'dummy.xml', bom: false },
            { LangOptions: {} }
        );
        expect(result.ok).toBe(true);
        expect(result.errors).toBeUndefined();
        expect(xmlParseMock).toHaveBeenCalledTimes(1); // Should not call parse again for the same file
    });
});

import { parse, type MemberNode, type StringNode } from '@humanwhocodes/momoa';
import { FioriJSONSourceCode } from '../../../src/language/json/source-code.js';
import type { ProjectContext } from '../../../src/project-context/project-context.js';
import { FioriLanguage } from '../../../src/language/fiori-language.js';
import { normalizePath } from '@sap-ux/project-access';

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const DUMMY_PROJECT_CONTEXT: ProjectContext = {} as any;

describe('FioriJSONSourceCode', () => {
    it('should return parsing result for .json file', () => {
        const jsonText = '{"type": "Object", "firstNode": {}}';
        const fioriLanguage = new FioriLanguage();
        const result = fioriLanguage.parse(
            { path: 'dummy.json', body: jsonText, physicalPath: 'dummy.json', bom: false },
            { LangOptions: {} }
        );

        expect(result.ok).toBe(true);
        expect(result.errors).toBeUndefined();
        expect(result.type).toBe('json');
        expect(result.ast.document.type).toBe('json');
        expect(result.ast.document.root.body.type).toBe('Object');
    });

    it('should return parsing result for .change file', () => {
        const jsonText = '{"type": "Object", "firstNode": {}}';
        const fioriLanguage = new FioriLanguage();
        const result = fioriLanguage.parse(
            { path: 'dummy.change', body: jsonText, physicalPath: 'dummy.change', bom: false },
            { LangOptions: {} }
        );

        expect(result.ok).toBe(true);
        expect(result.errors).toBeUndefined();
        expect(result.type).toBe('change');
        expect(result.ast.document.type).toBe('change');
    });

    it('should return parsing error (missing closing bracket)', () => {
        const jsonText = '{"type": "Object"';
        const fioriLanguage = new FioriLanguage();
        const result = fioriLanguage.parse(
            { path: 'dummy.json', body: jsonText, physicalPath: 'dummy.json', bom: false },
            { LangOptions: {} }
        );

        expect(result.ok).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].message).toBe(
            `Failed to parse file ${normalizePath('dummy.json')}: Unexpected end of input found. (1:18)`
        );
    });

    it('should get parent node if requested path array is empty', () => {
        const jsonText = '{"type": "Object", "firstNode": {"secondNode": {"thirdNode": {}}}}';
        const ast = parse(jsonText);
        const sourceCode = new FioriJSONSourceCode({
            text: jsonText,
            ast,
            projectContext: DUMMY_PROJECT_CONTEXT,
            uri: ''
        });

        expect(sourceCode.getNode(ast.body, [])).toMatchObject(ast.body);
    });

    it('should get parent node if requested node not found', () => {
        const jsonText = '{"type": "Object", "firstNode":{ "secondNode": {"thirdNode": {}}}}';
        const ast = parse(jsonText);
        const sourceCode = new FioriJSONSourceCode({
            text: jsonText,
            ast,
            projectContext: DUMMY_PROJECT_CONTEXT,
            uri: ''
        });

        expect(sourceCode.getNode(ast.body, ['path', 'to', 'node'])).toMatchObject(ast.body);
    });

    it('should get found first node', () => {
        const jsonText = '{"type": "Object", "firstNode": {}}';
        const ast = parse(jsonText);
        const sourceCode = new FioriJSONSourceCode({
            text: jsonText,
            ast,
            projectContext: DUMMY_PROJECT_CONTEXT,
            uri: ''
        });

        const foundNode = sourceCode.getNode(ast.body, ['firstNode']);
        expect(foundNode.type).toBe('Member');
        expect(((foundNode as MemberNode).name as StringNode).value).toBe('firstNode');
        expect(foundNode.loc).toMatchObject({
            start: {
                column: 20,
                line: 1,
                offset: 19
            },
            end: {
                column: 35,
                line: 1,
                offset: 34
            }
        });
    });

    it('should get third found node', () => {
        const jsonText = '{"type": "Object", "firstNode": {"secondNode": {"thirdNode": {}}}}';
        const ast = parse(jsonText);
        const sourceCode = new FioriJSONSourceCode({
            text: jsonText,
            ast,
            projectContext: DUMMY_PROJECT_CONTEXT,
            uri: ''
        });

        const foundNode = sourceCode.getNode(ast.body, ['firstNode', 'secondNode', 'thirdNode']);
        expect(foundNode.type).toBe('Member');
        expect(((foundNode as MemberNode).name as StringNode).value).toBe('thirdNode');
        expect(foundNode.loc).toMatchObject({
            start: {
                column: 49,
                line: 1,
                offset: 48
            },
            end: {
                column: 64,
                line: 1,
                offset: 63
            }
        });
    });

    it('should get second found node as third is not found', () => {
        const jsonText = '{"type": "Object", "firstNode": {"secondNode": {}}}';
        const ast = parse(jsonText);
        const sourceCode = new FioriJSONSourceCode({
            text: jsonText,
            ast,
            projectContext: DUMMY_PROJECT_CONTEXT,
            uri: ''
        });

        const foundNode = sourceCode.getNode(ast.body, ['firstNode', 'secondNode', 'thirdNode']);
        expect(foundNode.type).toBe('Member');
        expect(((foundNode as MemberNode).name as StringNode).value).toBe('secondNode');
        expect(foundNode.loc).toMatchObject({
            start: {
                column: 34,
                line: 1,
                offset: 33
            },
            end: {
                column: 50,
                line: 1,
                offset: 49
            }
        });
    });
});

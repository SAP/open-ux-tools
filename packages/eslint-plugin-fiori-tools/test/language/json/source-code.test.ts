import type { MemberNode, StringNode } from '@humanwhocodes/momoa';
import { parse } from '@humanwhocodes/momoa';
import { FioriJSONSourceCode } from '../../../src/language/json/source-code.js';
import type { ProjectContext } from '../../../src/project-context/project-context.js';

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const DUMMY_PROJECT_CONTEXT: ProjectContext = {} as any;

describe('FioriJSONSourceCode', () => {
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

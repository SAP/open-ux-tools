import { parse } from '@humanwhocodes/momoa';
import { FioriJSONSourceCode } from '../../../src/language/json/source-code.js';
import type { ProjectContext } from '../../../src/project-context/project-context.js';

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const DUMMY_PROJECT_CONTEXT: ProjectContext = {} as any;

describe('FioriJSONSourceCode', () => {
    it('should get parent node if requested path array is empty', () => {
        const jsonText =
            '{"type": "Object", "name": "StartNode", "members": [{"name": {"type": "String", "value": "dummy_name"}}]}';
        const ast = parse(jsonText);
        const sourceCode = new FioriJSONSourceCode({
            text: jsonText,
            ast,
            projectContext: DUMMY_PROJECT_CONTEXT,
            uri: ''
        });

        expect(sourceCode.getNode(ast.body, [])).toBe(ast.body);
    });

    it('should get parent node if requested node not found', () => {
        const jsonText =
            '{"type": "Object", "name": "StartNode", "members": [{"name": {"type": "Boolean", "value": "true"}}]}';
        const ast = parse(jsonText);
        const sourceCode = new FioriJSONSourceCode({
            text: jsonText,
            ast,
            projectContext: DUMMY_PROJECT_CONTEXT,
            uri: ''
        });

        expect(sourceCode.getNode(ast.body, ['path', 'to', 'node'])).toBe(ast.body);
    });

    it('should get found node', () => {
        const dummyNodeText = '{"type": "Member", "name": {"type": "String", "value": "DummyNode"}}';
        const jsonText = `{"type": "Object", "name": "StartNode", "members": [${dummyNodeText}]}`;
        const ast = parse(jsonText);
        const sourceCode = new FioriJSONSourceCode({
            text: jsonText,
            ast,
            projectContext: DUMMY_PROJECT_CONTEXT,
            uri: ''
        });

        const foundNode = sourceCode.getNode(ast.body, ['DummyNode']);
        expect(foundNode.loc).toMatchObject({
            start: {
                column: 1,
                line: 1,
                offset: 0
            },
            end: {
                column: 123,
                line: 1,
                offset: 122
            }
        });
    });
});

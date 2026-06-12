import { FioriJSONSourceCode } from '../../../src/language/json/source-code.js';
import type { ProjectContext } from '../../../src/project-context/project-context.js';

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const DUMMY_PROJECT_CONTEXT: ProjectContext = {} as any;

describe('FioriJSONSourceCode', () => {
    it('should get parent node if requested path array is empty', () => {
        const jsonText =
            '{"type": "Object", "name": "StartNode", "members": [{"name": {"type": "String", "value": "dummy_name"}}]}';
        const ast = JSON.parse(jsonText);
        const sourceCode = new FioriJSONSourceCode({
            text: jsonText,
            ast,
            projectContext: DUMMY_PROJECT_CONTEXT,
            uri: ''
        });

        expect(sourceCode.getNode(ast, [])).toBe(ast);
    });

    it('should get parent node if requested node not found', () => {
        const jsonText =
            '{"type": "Object", "name": "StartNode", "members": [{"name": {"type": "Boolean", "value": "true"}}]}';
        const ast = JSON.parse(jsonText);
        const sourceCode = new FioriJSONSourceCode({
            text: jsonText,
            ast,
            projectContext: DUMMY_PROJECT_CONTEXT,
            uri: ''
        });

        expect(sourceCode.getNode(ast, ['path', 'to', 'node'])).toBe(ast);
    });

    it('should get found node', () => {
        const dummyNodeText = '{"type": "Member", "name": {"type": "String", "value": "DummyNode"}}';
        const jsonText = `{"type": "Object", "name": "StartNode", "members": [${dummyNodeText}]}`;
        const ast = JSON.parse(jsonText);
        const dummyNode = JSON.parse(dummyNodeText);
        const sourceCode = new FioriJSONSourceCode({
            text: jsonText,
            ast,
            projectContext: DUMMY_PROJECT_CONTEXT,
            uri: ''
        });

        expect(sourceCode.getNode(ast, ['DummyNode'])).toMatchObject(dummyNode);
    });
});

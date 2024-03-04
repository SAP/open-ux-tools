import { VocabularyService } from '@sap-ux/odata-vocabularies';
import type { Path } from '@sap-ux/cds-annotation-parser';
import { parse, PATH_TYPE } from '@sap-ux/cds-annotation-parser';

import { VisitorState } from '../../../../src/transforms/annotation/visitor-state';
import { pathHandler } from '../../../../src/transforms/annotation/handlers/path';
import { isSubtree } from '../../../../src/transforms/annotation/handler';
import { initI18n } from '../../../../src/i18n';
import type { TextNode } from '@sap-ux/odata-annotation-core-types';

describe('annotation conversion', () => {
    beforeAll(async () => {
        await initI18n();
    });
    const vocabularyService = new VocabularyService(true);

    function getAst(path: string): Path {
        const ast = parse(`a:${path}`);
        if (ast?.type === 'annotation' && ast?.value?.type === PATH_TYPE) {
            return ast.value;
        } else {
            throw new Error('Failed to get AST');
        }
    }

    function runTestWithAst(ast: Path, expectedPath: string) {
        const state = new VisitorState(vocabularyService);
        const element = pathHandler.convert(state, ast);
        const textNode = element && !isSubtree(element) && element?.content[0].type === 'text' && element.content[0];
        const nodeText = textNode ? textNode.text : undefined;
        expect(nodeText).toStrictEqual(expectedPath);
        const fragmentRange = (textNode as TextNode)?.fragmentRanges;
        if (fragmentRange) {
            expect(fragmentRange.map((range) => `(${range.start.character},${range.end.character})`)).toMatchSnapshot();
        }
        expect(state.diagnostics).toMatchSnapshot();
        expect([...state.pathSet]).toStrictEqual([expectedPath]);
    }

    function createTest(text: string, expectedPath: string) {
        test(text, () => {
            runTestWithAst(getAst(text), expectedPath);
        });
    }

    describe('path handler', () => {
        describe('convert', () => {
            test('with no ranges', () => {
                runTestWithAst(
                    {
                        type: 'path',
                        value: 'test.path',
                        segments: [
                            {
                                type: 'identifier',
                                value: 'test'
                            },
                            {
                                type: 'identifier',
                                value: 'path'
                            }
                        ],
                        separators: [
                            {
                                type: 'separator',
                                value: '.',
                                escaped: false
                            }
                        ]
                    },
                    'test/path'
                );
            });
            // TODO: everything after @ is missing in AST node, check and fix
            // createTest('navigation.element@UI.Hidden', 'navigation/element@UI.Hidden');
            createTest('navigation.element.@UI.Hidden', 'navigation/element/@UI.Hidden');
            createTest('navigation/element/@UI.DataPoint#A', 'navigation/element/@UI.DataPoint#A');
            createTest('![navigation/element/@UI.DataPoint]', 'navigation/element/@UI.DataPoint');
            createTest('navigation.element/@UI.DataPoint#ABC', 'navigation/element/@UI.DataPoint#ABC');
            createTest('navigation.element.@UI.DataPoint/Value', 'navigation/element/@UI.DataPoint/Value');
            createTest('navigation.element.![@UI.DataPoint#B]/Value', 'navigation/element/@UI.DataPoint#B/Value');
            createTest('navigation.element.@UI.![DataPoint#C]/Value', 'navigation/element/@UI.DataPoint#C/Value');
            createTest('navigation.element.@UI.DataPoint#D/Value/', 'navigation/element/@UI.DataPoint#D/Value/');
            createTest('![navigation.element.@UI.DataPoint#E]/Value', 'navigation/element/@UI.DataPoint#E/Value');
            createTest('navigation/element', 'navigation/element');
        });
    });
});

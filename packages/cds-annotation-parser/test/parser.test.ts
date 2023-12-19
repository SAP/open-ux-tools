import { parse as parseInternal } from '../src/parser';
import { buildAst } from '../src/transformer';
import {
    getAssignment,
    getCst,
    getAst,
    getAllNormalizeFolderPath,
    transformCstForAssertion,
    doesExits,
    getBase
} from './utils';
import type { Position } from 'vscode-languageserver-types';
import { join } from 'path';
import { readFileSync } from 'fs';
import { findAnnotationNode, getAstNodes, getNode, parse } from '../src';


const testParser = async (testCasePath: string, valid = true): Promise<void> => {
    const text = await getAssignment(testCasePath);
    const { cst, lexErrors, parseErrors, tokens } = parseInternal(text);
    expect(lexErrors).toStrictEqual([]);
    if (valid) {
        expect(parseErrors).toStrictEqual([]);
    }
    let startPosition: Position | undefined;
    const base = getBase();
    const positionExits = await doesExits(join(base, testCasePath, 'position.json'));
    if (positionExits) {
        const position = readFileSync(join(base, testCasePath, 'position.json')).toString();
        if (position !== undefined) {
            startPosition = JSON.parse(position);
        }
    }
    const ast = buildAst(cst, tokens, startPosition);
    transformCstForAssertion(cst);
    expect(cst).toEqual(await getCst(testCasePath));
    expect(ast).toEqual(await getAst(testCasePath));
};

describe('cds annotation parser', () => {
    const allTests = getAllNormalizeFolderPath();
    const skip: string[] = [];
    const todo: string[] = [];
    const only: string[] = [];
    for (const t of allTests) {
        if (skip.includes(t)) {
            test.skip(`${t}`, () => {
                expect(false).toBeTruthy();
            });
            continue;
        }
        if (todo.includes(t)) {
            test.todo(`${t}`);
            continue;
        }
        if (only.includes(t)) {
            test.only(`${t}`, async () => {
                // NOSONAR
                await testParser(t, t.startsWith('valid'));
            });
            continue;
        }
        test(`${t}`, async () => {
            await testParser(t, t.startsWith('valid'));
        });
    }
});

test('Test for documented in README public API usage samples', () => {
    const ast = parse(`
      UI.LineItem #table1 : [
        {
          $type: 'UI.DataField',
          value: some.path,
          Label: 'Sample column'
        }  
      ]';
      `);

    if (ast !== undefined) {
        const pathToLabel = findAnnotationNode(ast, {
            position: { line: 5, character: 15 },
            includeDelimiterCharacters: true
        });
         expect(pathToLabel).toMatchInlineSnapshot(`"/value/items/0/properties/2/value"`);

        // An array of nodes matching each segment of the path.
        const nodes = getAstNodes(ast, pathToLabel);
        expect(nodes.length).toBe(6);
        expect(
            nodes.map((n) =>
                Array.isArray(n) ? '<array of child elements>' : typeof n === 'object' ? `Node of type '${n.type}'` : n
            )
        ).toMatchInlineSnapshot(`
            Array [
              "Node of type 'collection'",
              "<array of child elements>",
              "Node of type 'record'",
              "<array of child elements>",
              "Node of type 'record-property'",
              "Node of type 'string'",
            ]
        `);

        const termNode = getNode(ast, '/term');
        if (termNode.type === 'path') {
            const value = termNode.value;
            expect(value).toBe('UI.LineItem')
        }

        const qualifierNode = getNode(ast, '/value/items/0/properties/1/value');
        if (qualifierNode.type === 'qualifier') {
            const value = qualifierNode.value;
            expect(value).toBe('table1')
        }

        const propertyValueNode = getNode(ast, '/value/items/0/properties/1/value');
        if (propertyValueNode.type === 'path') {
            const value = propertyValueNode.value;
            expect(value).toBe('some.path')
        }
    }
});

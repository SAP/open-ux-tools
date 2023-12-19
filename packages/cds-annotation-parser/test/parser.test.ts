import { parse } from '../src/parser';
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

const testParser = async (testCasePath: string, valid = true): Promise<void> => {
    const text = await getAssignment(testCasePath);
    const { cst, lexErrors, parseErrors, tokens } = parse(text);
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
            test.only(`${t}`, async () => {  // NOSONAR
                await testParser(t, t.startsWith('valid'));
            });
            continue;
        }
        test(`${t}`, async () => {
            await testParser(t, t.startsWith('valid'));
        });
    }
});

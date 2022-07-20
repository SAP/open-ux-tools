import { readFile } from 'fs/promises';
import { join } from 'path';
import { buildAst } from '@xml-tools/ast';
import type { DocumentCstNode } from '@xml-tools/parser';
import { parse } from '@xml-tools/parser';

import { convertDocument } from '../../src/parser';

import { deserialize, FIXTURE_ROOT, getAllFixtures } from './utils/fixtures';

describe('fixtures', () => {
    const fixtures = getAllFixtures(FIXTURE_ROOT);
    for (const fixture of fixtures) {
        // const name = fixture.replace(FIXTURE_ROOT + sep, '').replace('.xml', '');
        test(`fixture ${fixture}`, async () => {
            const sourcePath = join(FIXTURE_ROOT, fixture);
            const text = await readFile(sourcePath, 'utf8');
            const expected = deserialize(await readFile(sourcePath.replace('.xml', '.json'), 'utf8'));
            const { cst, tokenVector } = parse(text);
            const ast = buildAst(cst as DocumentCstNode, tokenVector);
            const result = convertDocument(`file://${fixture}`, ast);
            normalize(result);
            expect(result).toStrictEqual(expected);
        });
    }
});

function normalize(source: any): void {
    const keys = Object.keys(source);
    for (const key of keys) {
        const value = source[key];
        if (value === undefined) {
            delete source[key];
        } else if (typeof value === 'object') {
            if (Array.isArray(value)) {
                for (const child of value) {
                    normalize(child);
                }
            } else {
                normalize(value);
            }
        }
    }
}

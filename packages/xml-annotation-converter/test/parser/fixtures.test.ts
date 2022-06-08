import { readFile } from 'fs/promises';
import { buildAst } from '@xml-tools/ast';
import type { DocumentCstNode } from '@xml-tools/parser';
import { parse } from '@xml-tools/parser';

import { convertDocument } from '../../src/parser';

import { deserialize, FIXTURE_ROOT, getAllFixtures } from './utils/fixtures';

describe('fixtures', async () => {
    const fixtures = await getAllFixtures(FIXTURE_ROOT);
    for (const fixture of fixtures) {
        const name = fixture.replace(FIXTURE_ROOT, '').replace('.xml', '');
        test(`fixture ${name}`, async () => {
            const text = await readFile(fixture, 'utf8');
            const expected = deserialize(await readFile(fixture.replace('.xml', '.json'), 'utf8'));
            const { cst, tokenVector } = parse(text);
            const ast = buildAst(cst as DocumentCstNode, tokenVector);
            const result = convertDocument(ast);
            expect(result).toStrictEqual(expected);
        });
    }
});

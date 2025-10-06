import os from 'node:os';
import { readFile } from 'fs/promises';
import { join } from 'node:path';
import { buildAst } from '@xml-tools/ast';
import type { DocumentCstNode } from '@xml-tools/parser';
import { parse } from '@xml-tools/parser';

import { convertDocument, convertMetadataDocument } from '../../src/parser';

import { deserialize, FIXTURE_ROOT, getAllFixtures } from './utils/fixtures';

const eolRegEx = new RegExp(os.EOL, 'g');

describe('fixtures', () => {
    const fixtures = getAllFixtures(FIXTURE_ROOT);
    for (const fixture of fixtures) {
        test(`fixture ${fixture}`, async () => {
            const sourcePath = join(FIXTURE_ROOT, fixture);
            const text = (await readFile(sourcePath, 'utf8')).replace(eolRegEx, '\n');
            const jsonContent = (await readFile(sourcePath.replace('.xml', '.json'), 'utf8')).replace(eolRegEx, '\n');
            const expected = deserialize(jsonContent);
            const { cst, tokenVector } = parse(text);
            const ast = buildAst(cst as DocumentCstNode, tokenVector);
            const uri = `file://${fixture}`;
            const document = convertDocument(uri, ast);
            const metadata = convertMetadataDocument(uri, ast);
            const result = {
                ...document,
                metadata
            };
            normalize(result);
            expect(result).toStrictEqual(expected);
        });
    }
});

function normalize(source: any): void {
    const keys = Object.keys(source);
    for (const key of keys) {
        const value = source[key];
        if (value === undefined || value === null) {
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

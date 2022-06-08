import { readFile, writeFile, readdir } from 'fs/promises';
import { join } from 'path';
import { URL } from 'url';

import { buildAst } from '@xml-tools/ast';
import { parse } from '@xml-tools/parser';
import prettier from 'prettier';
const { format, resolveConfig } = prettier;

import { convertDocument } from '../dist/src/parser/index.js';

const __dirname = new URL('.', import.meta.url).pathname;

const FIXTURE_ROOT = join(__dirname, '..', 'test', 'parser', 'fixtures');

async function update() {
    const fixtures = await getAllFixtures(FIXTURE_ROOT);

    const config = await resolveConfig(join(FIXTURE_ROOT));
    const printWithOptions = print({ ...config, parser: 'json' });
    const updates = fixtures.map(async (fixture) => {
        const text = await readFile(join(FIXTURE_ROOT, fixture), 'utf8');
        const { cst, tokenVector } = parse(text);
        const ast = buildAst(cst, tokenVector);
        const result = convertDocument(ast);
        const jsonFileName = fixture.replace('.xml', '.json');
        const formatted = printWithOptions(result);
        await writeFile(join(FIXTURE_ROOT, jsonFileName), formatted);
    });
    await Promise.all(updates);
}

const compactPosition = (position) => `(${position.line},${position.character})`;
const compactRange = (range) => `[${compactPosition(range.start)}..${compactPosition(range.end)}]`;
const rangePropertyPattern = /[a-z]*ranges?/i;

function compactAst(key, value) {
    if (rangePropertyPattern.test(key) && value) {
        if (Array.isArray(value)) {
            return value.map(compactRange);
        }
        return compactRange(value);
    }
    if (typeof value === 'object' && !Array.isArray(value)) {
        const keys = Object.keys(value).sort((a, b) => {
            const aIsArray = Array.isArray(value[a]);
            const bIsArray = Array.isArray(value[b]);
            const aIsObject = typeof value[a] === 'object' && !rangePropertyPattern.test(a);
            const bIsObject = typeof value[b] === 'object' && !rangePropertyPattern.test(b);

            if (aIsArray && bIsArray) {
                return 0;
            }
            if (aIsArray) {
                return 1;
            }
            if (bIsArray) {
                return -1;
            }

            if (aIsObject && bIsObject) {
                return 0;
            }
            if (aIsObject) {
                return 1;
            }
            if (bIsObject) {
                return -1;
            }
            return 0;
        });
        const returnValue = {};
        for (const key of keys) {
            returnValue[key] = value[key];
        }
        return returnValue;
    }
    return value;
}

function print(options) {
    return (value) => {
        const text = JSON.stringify(value, compactAst, 2) + '\n';
        return format(text, options);
    };
}

async function getAllFixtures(root) {
    const children = await readdir(root);
    return children.filter((child) => child.endsWith('.xml'));
}

update()
    .then(() => console.log('Fixture test data updated!'))
    .catch(console.error);

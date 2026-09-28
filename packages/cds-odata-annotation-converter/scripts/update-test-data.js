import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { format, resolveConfig } from 'prettier';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
import { VocabularyService } from '@sap-ux/odata-vocabularies';
import { toAssignment } from '../dist/transforms/annotation-file.js';
import { initI18n } from '../dist/index.js';
import { convertAnnotation } from '../dist/transforms/annotation/index.js';
const compactPosition = (position) => `(${position.line},${position.character})`;
const compactRange = (range) => `[${compactPosition(range.start)}..${compactPosition(range.end)}]`;
const rangePropertyPattern = /[a-z]*ranges?/i;
const ELEMENT_PROPERTY_ORDER = [
    'type',
    'range',
    'name',
    'nameRange',
    'namespace',
    'namespaceAlias',
    'attributes',
    'contentRange',
    'content'
];
const ATTRIBUTE_PROPERTY_ORDER = ['type', 'range', 'name', 'nameRange', 'value', 'valueRange'];
const TEXT_PROPERTY_ORDER = ['type', 'range', 'multilineType', 'text', 'fragmentRanges'];
function getPropertyOrder(type) {
    switch (type) {
        case 'element':
            return ELEMENT_PROPERTY_ORDER;
        case 'attribute':
            return ATTRIBUTE_PROPERTY_ORDER;
        case 'text':
            return TEXT_PROPERTY_ORDER;
    }
}
const compactAst = (key, value) => {
    if (rangePropertyPattern.test(key) && value) {
        if (Array.isArray(value)) {
            return value.map(compactRange);
        }
        return compactRange(value);
    } else if (typeof value === 'object' && !Array.isArray(value)) {
        const propertyOrder = getPropertyOrder(value.type);
        if (!propertyOrder) {
            return value;
        }
        const newValue = {};
        for (const propertyName of propertyOrder) {
            if (value[propertyName] !== undefined) {
                newValue[propertyName] = value[propertyName];
            }
        }
        return newValue;
    }
    return value;
};
const print = (options) => (value) => {
    const text = JSON.stringify(value, compactAst, 2) + '\n';
    return format(text, options);
};
const vocabularyService = new VocabularyService(true);
const update = async () => {
    await initI18n();
    const args = process.argv[2];
    const BASE = join(__dirname, '..', 'test', 'data', 'parser');
    const allTests = readdirSync(BASE, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);
    // we need a path to a json file to get correct config
    const options = await resolveConfig(join(BASE, 'fake.json'));
    options.parser = 'json';
    const printWithOptions = print(options);
    const tests = args ? [args] : allTests;
    for (const test of tests) {
        const ROOT = join(BASE, test);
        const text = readFileSync(join(ROOT, 'assignment.txt')).toString();
        const ast = toAssignment({ text, line: 0, character: 0 }, vocabularyService);
        const {
            terms,
            diagnostics = [],
            pathSet
        } = convertAnnotation(ast, {
            vocabularyService
        });
        writeFileSync(join(ROOT, 'ast.json'), await printWithOptions(ast));
        writeFileSync(join(ROOT, 'generic.json'), await printWithOptions(terms));
        writeFileSync(join(ROOT, 'diagnostics.json'), await printWithOptions(diagnostics));
        writeFileSync(join(ROOT, 'paths.json'), await printWithOptions([...pathSet.values()]));
    }
};
update()
    .then(() => console.log('Tests updated'))
    .catch(console.error);
 
 
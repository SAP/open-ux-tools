const { readdirSync, readFileSync, writeFileSync } = require('fs');
const { format, resolveConfig } = require('prettier');
const { join } = require('path');
const { VocabularyService } = require('@sap-ux/odata-vocabularies');
const { parse } = require('@sap/ux-cds-annotation-parser');
const { initI18n } = require('../dist');
const { convertAnnotation } = require('../dist/transforms/annotation');

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
        const ast = parse(text);
        const {
            terms,
            diagnostics = [],
            pathSet
        } = convertAnnotation(ast, {
            vocabularyService: new VocabularyService()
        });
        writeFileSync(join(ROOT, 'ast.json'), printWithOptions(ast));
        writeFileSync(join(ROOT, 'generic.json'), printWithOptions(terms));
        writeFileSync(join(ROOT, 'diagnostics.json'), printWithOptions(diagnostics));
        writeFileSync(join(ROOT, 'paths.json'), printWithOptions([...pathSet.values()]));
    }
};

update()
    .then(() => console.log('Tests updated'))
    .catch(console.error);

const { stat, readdirSync, readFileSync, writeFileSync, statSync } = require('fs');
const { join, dirname } = require('path');
const { parse } = require('../dist/parser');
const { buildAst } = require('../dist/transformer');
const {
    TOKEN_TYPE,
    EMPTY_VALUE_TYPE,
    NUMBER_LITERAL_TYPE,
    ENUM_TYPE,
    QUOTED_LITERAL_TYPE,
    BOOLEAN_TYPE,
    STRING_LITERAL_TYPE,
    MULTI_LINE_STRING_LITERAL_TYPE,
    PATH_TYPE,
    SEPARATOR_TYPE,
    IDENTIFIER_TYPE,
    OPERATOR_TYPE,
    UNSUPPORTED_OPERATOR_EXPRESSION_TYPE,
    INCORRECT_EXPRESSION_TYPE,
    CORRECT_EXPRESSION_TYPE,
    RECORD_PROPERTY_TYPE,
    RECORD_TYPE,
    COLLECTION_TYPE,
    QUALIFIER_TYPE,
    ANNOTATION_TYPE,
    ANNOTATION_GROUP_TYPE,
    ANNOTATION_GROUP_ITEMS_TYPE,
    FLATTENED_EXPRESSION_TYPE,
    FLATTENED_PATH_TYPE,
    FLATTENED_ANNOTATION_SEGMENT_TYPE,
    FLATTENED_PROPERTY_SEGMENT_TYPE
} = require('../dist');
const compactPosition = (position) => `(${position.line},${position.character})`;
const compactRange = (range) => `[${compactPosition(range.start)}..${compactPosition(range.end)}]`;
const rangePropertyPattern = /[a-z]*ranges?/i;

const nodeProperties = ['type', 'range'];
const valueNodeProperties = [...nodeProperties, 'value'];
const expressionProperties = ['operators', 'operands', 'openToken', 'closeToken'];
const delimiterTokens = ['openToken', 'closeToken'];

const NODE_PROPERTIES = {
    [TOKEN_TYPE]: [...valueNodeProperties],
    [EMPTY_VALUE_TYPE]: [...nodeProperties],
    [NUMBER_LITERAL_TYPE]: [...valueNodeProperties],
    [ENUM_TYPE]: [...nodeProperties, 'path'],
    [QUOTED_LITERAL_TYPE]: ['type', 'kind', 'range', 'value'],
    [BOOLEAN_TYPE]: [...valueNodeProperties],
    [STRING_LITERAL_TYPE]: [...valueNodeProperties, ...delimiterTokens],
    [MULTI_LINE_STRING_LITERAL_TYPE]: [...nodeProperties, 'stripIndentation', 'value', ...delimiterTokens],
    [PATH_TYPE]: [...valueNodeProperties, 'segments', 'separators'],
    [SEPARATOR_TYPE]: [...valueNodeProperties, 'escaped'],
    [IDENTIFIER_TYPE]: [...valueNodeProperties, 'quoted'],
    [OPERATOR_TYPE]: [...valueNodeProperties],
    [UNSUPPORTED_OPERATOR_EXPRESSION_TYPE]: [...nodeProperties, 'unsupportedOperator', ...expressionProperties],
    [INCORRECT_EXPRESSION_TYPE]: [...nodeProperties, 'message', ...expressionProperties],
    [CORRECT_EXPRESSION_TYPE]: [...nodeProperties, 'operatorName', ...expressionProperties],
    [RECORD_PROPERTY_TYPE]: [...nodeProperties, 'colon', 'name', 'value'],
    [RECORD_TYPE]: [...nodeProperties, 'properties', 'annotations', 'flattenedExpressions', 'commas', ...delimiterTokens],
    [COLLECTION_TYPE]: [...nodeProperties, 'items', 'commas', ...delimiterTokens],
    [QUALIFIER_TYPE]: [...valueNodeProperties],
    [ANNOTATION_TYPE]: [...nodeProperties, 'term', 'qualifier', 'colon', 'value'],
    [ANNOTATION_GROUP_TYPE]: [...nodeProperties, 'name', 'colon', 'items'],
    [ANNOTATION_GROUP_ITEMS_TYPE]: [...nodeProperties, ...delimiterTokens, 'items', 'commas'],
    [FLATTENED_EXPRESSION_TYPE]: [...nodeProperties, 'path', 'colon', 'value'],
    [FLATTENED_PATH_TYPE]: [...nodeProperties, 'value', 'segments', 'separators'],
    [FLATTENED_ANNOTATION_SEGMENT_TYPE]: [...nodeProperties, 'value', 'prefix', 'vocabulary', 'term', 'qualifier'],
    [FLATTENED_PROPERTY_SEGMENT_TYPE]: [...nodeProperties, 'name']
};

const compactAst = (key, value) => {
    if (value === 0 && 1 / value < 0) {
        // when serializing 0 the sign is removed, we need to avoid this lossy transformation
        return 'NEGATIVE_ZERO';
    }
    if (rangePropertyPattern.test(key) && value) {
        if (Array.isArray(value)) {
            return value.map(compactRange);
        }
        return compactRange(value);
    }
    if (typeof value === 'object' && !Array.isArray(value)) {
        const orderedProperties = NODE_PROPERTIES[value.type];
        if (!orderedProperties) {
            throw new Error(`Missing configuration for node type "${value.type}". ${JSON.stringify(value)}`);
        }
        const existingProperties = Object.keys(value);
        for (const property of existingProperties) {
            if (!orderedProperties.includes(property)) {
                throw new Error(`Missing "${property}" in configuration for node type "${value.type}"`);
            }
        }
        const newValue = {};
        for (const property of orderedProperties) {
            newValue[property] = value[property];
        }
        return newValue;
    }
    return value;
};

const CST_NODE_PROPERTIES = ['name', 'recoveredNode', 'tokenTypeName', 'image', 'startOffset', 'endOffset'];

const compactCst = (key, value) => {
    if (value === 0 && 1 / value < 0) {
        // when serializing 0 the sign is removed, we need to avoid this lossy transformation
        return 'NEGATIVE_ZERO';
    }
    if (rangePropertyPattern.test(key) && value) {
        if (Array.isArray(value)) {
            return value.map(compactRange);
        }
        return compactRange(value);
    }
    if (typeof value === 'object' && !Array.isArray(value)) {
        const sortedKeys = Object.keys(value).sort((a, b) => {
            const indexA = CST_NODE_PROPERTIES.indexOf(a);
            const indexB = CST_NODE_PROPERTIES.indexOf(b);
            if (indexA === -1 && indexB === -1) {
                return a.localeCompare(b);
            }
            if (indexA === -1) {
                return 1;
            }
            if (indexB === -1) {
                return -1;
            }
            return indexA - indexB;
        });
        const newValue = {};
        for (const key of sortedKeys) {
            newValue[key] = value[key];
        }
        return newValue;
    }
    return value;
};

const isCstNode = (node) => {
    return node.children !== undefined;
};

const transformCstForAssertion = (node) => {
    if (isCstNode(node)) {
        reduceLocationInfo(node.location);
        const allChildren = Object.keys(node.children).reduce((acc, child) => [...acc, ...node.children[child]], []);
        for (const child of allChildren) {
            transformCstForAssertion(child);
        }
    } else if ([null, undefined].includes(node.image) !== true) {
        reduceTokenInfo(node);
    } else {
        throw Error('None Exhaustive Match');
    }
};

const reduceLocationInfo = (location) => {
    if (isNaN(location.startOffset)) {
        location.startOffset = -1;
    }

    if (isNaN(location.endOffset)) {
        location.endOffset = -1;
    }
    delete location.startLine;
    delete location.endLine;
    delete location.startColumn;
    delete location.endColumn;
};

const reduceTokenInfo = (token) => {
    if (isNaN(token.startOffset)) {
        token.startOffset = -1;
    }

    if (isNaN(token.endOffset)) {
        token.endOffset = -1;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    token.tokenTypeName = token.tokenType.name;
    delete token.startLine;
    delete token.endLine;
    delete token.startColumn;
    delete token.endColumn;
    delete token.tokenTypeIdx;
    delete token.tokenType;
};

const print = (value, transform) => {
    const text = JSON.stringify(value, transform, 2) + '\n';
    return text;
};
const doesExits = (path) => {
    return new Promise((resolve) => {
        stat(path, (err) => {
            if (err) {
                resolve(false);
            }
            resolve(true);
        });
    });
};
const getAllAssignments = (base, allAssignment = []) => {
    const fileOrFolder = readdirSync(base);
    fileOrFolder.forEach(function (item) {
        const itemPath = join(base, item);
        if (statSync(itemPath).isDirectory()) {
            allAssignment = getAllAssignments(itemPath, allAssignment);
        } else {
            if (itemPath.endsWith('.txt')) {
                allAssignment.push(itemPath);
            }
        }
    });

    return allAssignment;
};
const update = async () => {
    const args = process.argv[2];
    const cstOrAst = process.argv[3];
    const BASE = join(__dirname, '..', 'test', 'data');
    const allAssignments = getAllAssignments(BASE);
    const tests = args ? [join(BASE, args, 'assignment.txt')] : allAssignments;
    for (const test of tests) {
        try {
            const ROOT = dirname(test);

            const text = readFileSync(test).toString();
            const { cst, tokens } = parse(text);
            const positionExits = await doesExits(join(ROOT, 'position.json'));
            let startPosition = undefined;
            if (positionExits) {
                const position = readFileSync(join(ROOT, 'position.json')).toString();
                if (position !== undefined) {
                    startPosition = JSON.parse(position);
                }
            }
            const ast = buildAst(cst, tokens, startPosition);
            if (cstOrAst === 'cst') {
                transformCstForAssertion(cst);
                writeFileSync(join(ROOT, 'cst.json'), print(cst, compactCst));
            } else if (cstOrAst === 'ast') {
                writeFileSync(join(ROOT, 'ast.json'), print(ast, compactAst));
            } else {
                transformCstForAssertion(cst);
                writeFileSync(join(ROOT, 'cst.json'), print(cst, compactCst));
                writeFileSync(join(ROOT, 'ast.json'), print(ast, compactAst));
            }
        } catch (error) {
            let possibleSolution = '';
            if (error.message === "Cannot read properties of undefined (reading 'line')") {
                possibleSolution = `Please add "position.json" file under ${join(
                    BASE,
                    test
                )} . Please adjust its content. i.e { "line": 0, "character": 0 }`;
            }
            throw { error, testFolderPath: test, possibleSolution };
        }
    }
};

update()
    .then(() => console.log('Tests updated'))
    .catch(console.error);

const { stat, readdirSync, readFileSync, writeFileSync, statSync } = require('fs');
const { join, dirname } = require('path');
const { parse } = require('../dist/parser');
const { buildAst } = require('../dist/transformer');
const compactPosition = (position) => `(${position.line},${position.character})`;
const compactRange = (range) => `[${compactPosition(range.start)}..${compactPosition(range.end)}]`;
const rangePropertyPattern = /[a-z]*ranges?/i;

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
        const sortedKeys = Object.keys(value).sort();
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

const print = (value) => {
    const text = JSON.stringify(value, compactAst, 2) + '\n';
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
                writeFileSync(join(ROOT, 'cst.json'), print(cst));
            } else if (cstOrAst === 'ast') {
                writeFileSync(join(ROOT, 'ast.json'), print(ast));
            } else {
                transformCstForAssertion(cst);
                writeFileSync(join(ROOT, 'cst.json'), print(cst));
                writeFileSync(join(ROOT, 'ast.json'), print(ast));
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

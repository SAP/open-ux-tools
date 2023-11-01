"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
const parser_utils_1 = require("../parser-utils");
// const { parse } = require('../dist/parser');
// const { buildAst } = require('../dist/transformer');
// const compactPosition = (position) => `(${position.line},${position.character})`;
// const compactRange = (range) => `[${compactPosition(range.start)}..${compactPosition(range.end)}]`;
const rangePropertyPattern = /[a-z]*ranges?/i;
const isCstNode = (node) => {
    return node.children !== undefined;
};
// const print = (value) => {
//     const text = JSON.stringify(value, compactAst, 2) + '\n';
//     return text;
// };
const doesExits = (path) => {
    return new Promise((resolve) => {
        (0, fs_1.stat)(path, (err) => {
            if (err) {
                resolve(false);
            }
            resolve(true);
        });
    });
};
const getAllAssignments = (base, allAssignment) => {
    const fileOrFolder = (0, fs_1.readdirSync)(base);
    fileOrFolder.forEach(function (item) {
        const itemPath = (0, path_1.join)(base, item);
        if ((0, fs_1.statSync)(itemPath).isDirectory()) {
            allAssignment = getAllAssignments(itemPath, allAssignment);
        }
        else {
            if (itemPath.endsWith('.xml')) {
                allAssignment.push(itemPath);
            }
        }
    });
    return allAssignment;
};
const update = async () => {
    const args = process.argv[2];
    const BASE = (0, path_1.join)(__dirname, '..', 'test', 'data', 'odata-annotations-core');
    const allAssignments = getAllAssignments(BASE, []);
    const tests = args ? [(0, path_1.join)(BASE, args, 'annotations.xml')] : allAssignments;
    for (const test of tests) {
        try {
            const ROOT = (0, path_1.dirname)(test);
            const text = (0, fs_1.readFileSync)(test).toString();
            const { file, position } = (0, parser_utils_1.getAnnotationFile)(text);
            const positionExits = await doesExits((0, path_1.join)(ROOT, 'position.json'));
            let startPosition = undefined;
            if (positionExits) {
                const position = (0, fs_1.readFileSync)((0, path_1.join)(ROOT, 'position.json')).toString();
                if (position !== undefined) {
                    startPosition = JSON.parse(position);
                }
            }
            (0, fs_1.writeFileSync)((0, path_1.join)(ROOT, 'annotationFile.json'), JSON.stringify(file));
            (0, fs_1.writeFileSync)((0, path_1.join)(ROOT, 'cursorPosition.json'), JSON.stringify(position));
        }
        catch (error) {
            throw { error, testFolderPath: test };
        }
    }
};
update()
    .then(() => console.log('Tests updated'))
    .catch(console.error);
//# sourceMappingURL=updateOdataAnnotationCoreTestData.js.map
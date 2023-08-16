'use strict';
const { getResourcePaths } = require('./lib/utils');
const { sourceCodePath, testCodePath } = getResourcePaths();
const overrides = [
    {
        'plugins': ['@typescript-eslint'],
        'files': [`./${sourceCodePath}/*.ts`, `./${sourceCodePath}/**/*.ts`],
        'excludedFiles': ['*.d.ts', '**/*.d.ts'],
        'parser': '@typescript-eslint/parser',
        'extends': ['plugin:@typescript-eslint/recommended'],
        'parserOptions': {
            'project': ['./tsconfig.json']
        }
    }
];
if (testCodePath) {
    overrides[0].files.push(`./${testCodePath}/*.ts`);
    overrides[0].files.push(`./${testCodePath}/**/*.ts`);
}

module.exports = {
    overrides
};

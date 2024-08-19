'use strict';
const { getResourcePaths } = require('./lib/utils');
const { sourceCodePath, testCodePath } = getResourcePaths();
const overrides = [
    {
        'plugins': ['@typescript-eslint'],
        'files': [`./${sourceCodePath}/*.ts`, `./${sourceCodePath}/**/*.ts`],
        'excludedFiles': [
            'target/**',
            `${sourceCodePath}/test/changes_loader.ts`,
            `${sourceCodePath}/test/changes_preview.ts`,
            `${sourceCodePath}/localservice/**`,
            `${sourceCodePath}/localService/**`,
            `${testCodePath}/**/Example.qunit.ts`,
            'backup/**',
            '*.d.ts',
            '**/*.d.ts'
        ],
        'parser': '@typescript-eslint/parser',
        'extends': [
            'plugin:@typescript-eslint/recommended',
            'plugin:@typescript-eslint/recommended-requiring-type-checking'
        ],
        'parserOptions': {
            'project': true // uses local tsconfig.json nearest to file being linted. Especially important for monorepos
        },
        'rules': {
            '@typescript-eslint/no-unsafe-call': 'warn',
            '@typescript-eslint/no-unsafe-member-access': 'warn',
            '@typescript-eslint/no-unsafe-return': 'warn',
            '@typescript-eslint/no-unsafe-argument': 'warn',
            '@typescript-eslint/no-unsafe-assignment': 'warn'
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

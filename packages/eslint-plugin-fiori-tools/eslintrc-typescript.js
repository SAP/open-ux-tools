'use strict';
const { getWebAppPath } = require('./lib/utils');
const webappPath = getWebAppPath();
module.exports = {
    overrides: [
        {
            'plugins': ['@typescript-eslint'],
            'files': [`./${webappPath}/*.ts`, `./${webappPath}/**/*.ts`],
            'excludedFiles': ['*.d.ts', '**/*.d.ts'],
            'parser': '@typescript-eslint/parser',
            'extends': ['plugin:@typescript-eslint/recommended'],
            'parserOptions': {
                'project': ['./tsconfig.json']
            },
            'rules': {
                '@typescript-eslint/no-unused-vars': 'off'
            }
        }
    ]
};

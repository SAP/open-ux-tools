'use strict';

module.exports = {
    overrides: [
        {
            'plugins': ['@typescript-eslint'],
            'files': ['*.ts', '**/*.ts'],
            'excludedFiles': ['*.d.ts', '**/*.d.ts'],
            'parser': '@typescript-eslint/parser',
            'extends': ['plugin:@typescript-eslint/recommended'],
            'parserOptions': {
                'project': ['./tsconfig.json']
            },
            'rules': {
                '@typescript-eslint/no-unused-vars': 'off',
                '@typescript-eslint/no-empty-function': 'off'
            }
        }
    ]
};

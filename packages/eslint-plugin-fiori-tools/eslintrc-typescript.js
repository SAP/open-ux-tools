'use strict';

module.exports = {
    overrides: [
        {
            'plugins': ['@typescript-eslint'],
            'files': ['*.ts'],
            'parser': '@typescript-eslint/parser',
            'extends': ['plugin:@typescript-eslint/recommended'],
            'parserOptions': {
                'project': ['./tsconfig.json']
            }
        }
    ]
};

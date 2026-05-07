import base from '../../eslint.config.mjs';

const __dirname = import.meta.dirname;

export default [
    ...base,
    {
        languageOptions: {
            parserOptions: {
                tsconfigRootDir: __dirname,
                project: './tsconfig.eslint.json',
            }
        }
    },
    {
        'rules': {
            '@typescript-eslint/naming-convention': [
                'off',
                { 'selector': 'variable', 'format': ['UPPER_CASE', 'snake_case'] }
            ]
        }
    },
    {
        'files': ['src/parser/parser.ts'],
        'rules': {
            'new-cap': [
                'warn',
                {
                    'capIsNew': false
                }
            ]
        }
    },
    {
        'files': ['src/parser/tokens.ts'],
        'rules': {
            'camelcase': [
                'warn',
                {
                    'properties': 'never'
                }
            ]
        }
    }
];

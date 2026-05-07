import base from '../../eslint.config.mjs';
import tseslint from 'typescript-eslint';
const tsParser = tseslint.parser;

const __dirname = import.meta.dirname;

export default [
    ...base,
    {
        ignores: ['**/*.cjs']
    },
    {
        languageOptions: {
            parserOptions: {
                parser: tsParser,
                tsconfigRootDir: __dirname,
                project: './tsconfig.eslint.json'
            }
        },
        'rules': {
            '@typescript-eslint/no-use-before-define': ['off']
        }
    }
];

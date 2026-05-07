import base from '../../eslint.config.mjs';
import tseslint from 'typescript-eslint';
const tsParser = tseslint.parser;

const __dirname = import.meta.dirname;

export default [
    {
        ignores: ['test/json-esm-transform.mjs', 'jest.resolver.cjs']
    },
    ...base,
    {
        languageOptions: {
            parserOptions: {
                parser: tsParser,
                tsconfigRootDir: __dirname,
                project: './tsconfig.eslint.json',
            },
        },
        rules: {
            'import/no-unresolved': ['error', { ignore: ['^@modelcontextprotocol/sdk'] }]
        }
    },
];
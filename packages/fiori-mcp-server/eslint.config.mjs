import base from '../../eslint.config.mjs';

const __dirname = import.meta.dirname;

export default [
    {
        ignores: ['test/json-esm-transform.mjs', 'jest.resolver.cjs']
    },
    ...base,
    {
        languageOptions: {
            parserOptions: {
                tsconfigRootDir: __dirname,
                project: './tsconfig.eslint.json',
            },
        },
        rules: {
            'import/no-unresolved': ['error', { ignore: ['^@modelcontextprotocol/sdk'] }]
        }
    },
];
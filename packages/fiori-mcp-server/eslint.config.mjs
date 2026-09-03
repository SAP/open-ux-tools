import base from '../../eslint.config.mjs';

export default [
    {
        ignores: ['test/json-esm-transform.mjs', 'jest.resolver.cjs']
    },
    ...base,
    {
        rules: {
            'import/no-unresolved': ['error', { ignore: ['^@modelcontextprotocol/sdk'] }]
        }
    },
];
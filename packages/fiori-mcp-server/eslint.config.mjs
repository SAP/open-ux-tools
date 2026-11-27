import { createConfig } from '../../eslint.config.mjs';

export default [
    {
        ignores: ['test/json-esm-transform.mjs', 'jest.resolver.cjs']
    },
    ...createConfig(import.meta.dirname),
    {
        rules: {
            'import/no-unresolved': ['error', { ignore: ['^@modelcontextprotocol/sdk'] }]
        }
    },
];
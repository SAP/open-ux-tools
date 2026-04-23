const base = require('../../eslint.config.js');
const { tsParser } = require('typescript-eslint');

module.exports = [
    ...base,
    {
        languageOptions: {
            parserOptions: {
                parser: tsParser,
                tsconfigRootDir: __dirname,
                project: './tsconfig.eslint.json',
            },
        },
    },
    {
        rules: {
            // @modelcontextprotocol/sdk uses package exports (no physical files at subpaths);
            // TypeScript + esbuild resolve it correctly at build time.
            'import/no-unresolved': ['error', { ignore: ['^@modelcontextprotocol/sdk/'] }]
        }
    }
];
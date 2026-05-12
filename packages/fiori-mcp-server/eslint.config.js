const base = require('../../eslint.config.js');

module.exports = [
    ...base,
    {
        languageOptions: {
            parserOptions: {
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
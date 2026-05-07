import base from '../../../eslint.config.mjs';
import tseslint from 'typescript-eslint';
const tsParser = tseslint.parser;
const __dirname = import.meta.dirname;

export default [
    {
        ignores: ['test/fixtures', 'dist', 'version.js', '**/playwright-report/**']
    },
    ...base,
    {
        languageOptions: {
            parserOptions: {
                parser: tsParser,
                tsconfigRootDir: __dirname,
                project: 'tsconfig.eslint.json'
            }
        },
        rules: {
            'no-console': 'off'
        }
    }
];

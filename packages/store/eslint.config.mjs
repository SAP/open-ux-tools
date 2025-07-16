import baseConfig from '../../eslint.config.mjs';
import { fileURLToPath } from 'url';
import path from 'path';

export default [
    {
        ignores: ['test/output', 'test/input', 'dist']
    },
    ...baseConfig,
    {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
            parserOptions: {
                project: './tsconfig.eslint.json',
                tsconfigRootDir: path.dirname(fileURLToPath(import.meta.url))
            }
        },
        rules: {
            'jsdoc/require-returns': 0,
            'jsdoc/require-param': 0,
            'jsdoc/require-jsdoc': 0,
            'jsdoc/match-description': 0,
            'jsdoc/multiline-blocks': 0,
            'jsdoc/tag-lines': 0,
            'jsdoc/require-param-description': 0,
            'jsdoc/no-multi-asterisks': 0,
            'jsdoc/check-tag-names': 0
        }
    }
];

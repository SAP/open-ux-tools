import baseConfig from '../../eslint.config.mjs';
import { fileURLToPath } from 'url';
import path from 'path';

export default [
    {
        ignores: [
            'generators',
            'test/int/fiori-elements/expected-output',
            'test/int/fiori-freestyle/expected-output',
            'test/**/*.js'
        ]
    },
    ...baseConfig,
    {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
            parserOptions: {
                project: './tsconfig.eslint.json',
                tsconfigRootDir: path.dirname(fileURLToPath(import.meta.url))
            }
        }
    }
];

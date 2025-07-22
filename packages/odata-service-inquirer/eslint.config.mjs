import baseConfig from '../../eslint.config.mjs';
import { fileURLToPath } from 'url';
import path from 'path';

export default [
    {
        ignores: ['dist', 'test/**/*.js', 'test/**/*.ts'] // ignoring all JS files in the test directory
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
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    varsIgnorePattern: '^(ServiceSelectionPromptOptions|OdataServicePromptOptions|ODataServiceInfo)$',
                    caughtErrors: 'none'
                }
            ]
        }
    }
];

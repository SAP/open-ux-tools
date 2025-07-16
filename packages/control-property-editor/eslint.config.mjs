import baseConfig from '../../eslint.config.mjs';
import react from 'eslint-plugin-react';
import { fileURLToPath } from 'url';
import path from 'path';

export default [
    {
        ignores: ['dist']
    },
    ...baseConfig,
    {
        files: ['**/*.ts', '**/*.tsx'],
        ...react.configs.flat.recommended,
        settings: {
            'react': {
                'version': 'detect'
            }
        }
    },
    {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
            parserOptions: {
                project: './tsconfig.eslint.json',
                tsconfigRootDir: path.dirname(fileURLToPath(import.meta.url))
            }
        },
        plugins: { react },
        rules: {
            // switched off temporarily until logger for webapps
            'no-console': 'off'
        }
    }
];

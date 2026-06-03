import base from '../../eslint.config.mjs';
import eslintPlugin from 'eslint-plugin-eslint-plugin';

const __dirname = import.meta.dirname;


export default [
    {
        ignores: [
            'config/**/eslintrc*.js',
            'test/global-setup.js',
            'jest.resolver.cjs',
            'test/babel-eslint-parser.transformer.cjs'
        ]
    },
    ...base,
    {
        languageOptions: {
            parserOptions: {
                tsconfigRootDir: __dirname,
                project: './tsconfig.eslint.json'
            }
        }
    },
    eslintPlugin.configs.recommended
];

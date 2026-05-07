import base from '../../eslint.config.mjs';
import eslintPlugin from 'eslint-plugin-eslint-plugin';
import tseslint from 'typescript-eslint';

const __dirname = import.meta.dirname;

const tsParser = tseslint.parser;

export default [
    {
        ignores: ['config/**/eslintrc*.js', 'test/global-setup.js', 'jest.resolver.cjs']
    },
    ...base,
    {
        languageOptions: {
            parserOptions: {
                parser: tsParser,
                tsconfigRootDir: __dirname,
                project: './tsconfig.eslint.json'
            }
        }
    },
    eslintPlugin.configs.recommended
];

import { createConfig } from '../../eslint.config.mjs';
import eslintPlugin from 'eslint-plugin-eslint-plugin';


export default [
    {
        ignores: [
            'config/**/eslintrc*.js',
            'test/global-setup.js',
            'jest.resolver.cjs',
            'test/babel-eslint-parser.transformer.cjs'
        ]
    },
    ...createConfig(import.meta.dirname),
    eslintPlugin.configs.recommended
];

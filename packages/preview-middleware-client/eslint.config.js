const { FlatCompat } = require('@eslint/eslintrc');
const { ignores } = require('eslint-plugin-prettier/recommended');
const compat = new FlatCompat({
    baseDirectory: __dirname, // optional; default: process.cwd()
    resolvePluginsRelativeTo: __dirname // optional
});

module.exports = [
    {
        ignores: ['dist', 'coverage', 'eslint.config.js', 'jest.config.js']
    },
    ...compat.extends('plugin:@typescript-eslint/recommended'), // todo fix loading this
    {
        languageOptions: {
            parserOptions: {
                tsconfigRootDir: __dirname,
                project: './tsconfig.eslint.json'
            }
        },
        rules: {
            'quotes': ['error', 'single', { 'allowTemplateLiterals': true }],
            // 'valid-jsdoc': [ // TODO: enable this rule
            //     'error',
            //     {
            //         requireParamType: false,
            //         requireReturn: false,
            //         requireReturnType: false
            //     }
            // ],
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    varsIgnorePattern: '^_',
                    argsIgnorePattern: '^_'
                }
            ],
            '@typescript-eslint/no-unsafe-argument': 'warn',
            '@typescript-eslint/no-unsafe-member-access': 'warn',
            '@typescript-eslint/no-unsafe-assignment': 'warn',
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-empty-object-type': 'warn'
        }
    },
    {
        files: ['types/*.*'],
        rules: {
            '@typescript-eslint/no-namespace': 'off',
            'jsdoc/require-jsdoc': 'off'
        }
    }
];

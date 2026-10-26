import config from '../../eslint.config.mjs';

export default [
    ...config,
    { ignores: ['dist/**', 'esbuild.js'] },
    {
        files: ['test/**/*.cjs'],
        rules: {
            '@typescript-eslint/no-require-imports': 'off',
            'jsdoc/require-jsdoc': 'off'
        }
    }
];

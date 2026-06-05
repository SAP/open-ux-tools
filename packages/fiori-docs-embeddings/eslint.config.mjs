import base from '../../eslint.config.mjs';

export default [
    {
        ignores: ['dist/**', 'data/**', 'coverage/**', 'index.js'],
    },
    ...base
];
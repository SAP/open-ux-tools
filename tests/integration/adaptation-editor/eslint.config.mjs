import base from '../../../eslint.config.mjs';

export default [
    {
        ignores: ['test/fixtures', 'dist', 'version.js', '**/playwright-report/**']
    },
    ...base,
    {
        rules: {
            'no-console': 'off'
        }
    }
];

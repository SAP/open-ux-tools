import base from '../../eslint.config.mjs';

export default [
    ...base,
    {
        rules: {
            'import/no-unresolved': ['error', { ignore: ['^@sap/ux-specification'] }]
        }
    }
];
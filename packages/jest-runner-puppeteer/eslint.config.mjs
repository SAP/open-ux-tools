import base from '../../eslint.config.mjs';

export default [
    ...base,
    {
        rules: {
            'jsdoc/require-returns': 'off',
            'jsdoc/require-param': 'off',
            'jsdoc/require-jsdoc': 'off',
            'jsdoc/match-description': 'off',
            'jsdoc/multiline-blocks': 'off',
            'jsdoc/tag-lines': 'off',
            'jsdoc/require-param-description': 'off',
            'jsdoc/no-multi-asterisks': 'off',
            'jsdoc/check-tag-names': 'off'
        }
    }
];

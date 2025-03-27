//------------------------------------------------------------------------------
// Plugin Definition
//------------------------------------------------------------------------------

module.exports.configs = {
    defaultTS: {
        extends: [
            './legacy/eslintrc-common.js',
            './legacy/eslintrc-typescript.js',
            './legacy/eslintrc-prod.js',
            './legacy/eslintrc-test.js'
        ],
        parser: '@typescript-eslint/parser' // override parser used in eslint-plugin-fiori-custom to support TS
    },
    defaultJS: {
        extends: ['./legacy/eslintrc-common.js', './legacy/eslintrc-prod.js', './legacy/eslintrc-test.js']
    },
    testCode: {
        extends: ['./legacy/eslintrc-common.js', './legacy/eslintrc-typescript.js', './legacy/eslintrc-test.js']
    },
    prodCode: {
        extends: ['./legacy/eslintrc-common.js', './legacy/eslintrc-typescript.js', './legacy/eslintrc-prod.js']
    },
    flat: {
        defaultTS: {
            extends: [
                './flat/eslintrc-common.js',
                './flat/eslintrc-typescript.js',
                './flat/eslintrc-prod.js',
                './flat/eslintrc-test.js'
            ],
            parser: '@typescript-eslint/parser' // override parser used in eslint-plugin-fiori-custom to support TS
        },
        defaultJS: {
            extends: ['./flat/eslintrc-common.js', './flat/eslintrc-prod.js', './flat/eslintrc-test.js']
        },
        testCode: {
            extends: ['./flat/eslintrc-common.js', './flat/eslintrc-typescript.js', './flat/eslintrc-test.js']
        },
        prodCode: {
            extends: ['./flat/eslintrc-common.js', './flat/eslintrc-typescript.js', './flat/eslintrc-prod.js']
        },
    }
};

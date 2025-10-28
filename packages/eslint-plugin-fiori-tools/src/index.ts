//------------------------------------------------------------------------------
// Plugin Definition
//------------------------------------------------------------------------------

export const config = {
    defaultTS: {
        extends: [
            '../config/legacy/eslintrc-common.js',
            '../config/legacy/eslintrc-typescript.js',
            '../config/legacy/eslintrc-prod.js',
            '../config/legacy/eslintrc-test.js'
        ],
        parser: '@typescript-eslint/parser' // override parser used in eslint-plugin-fiori-custom to support TS
    },
    defaultJS: {
        extends: [
            '../config/legacy/eslintrc-common.js',
            '../config/legacy/eslintrc-prod.js',
            '../config/legacy/eslintrc-test.js'
        ]
    },
    testCode: {
        extends: [
            '../config/legacy/eslintrc-common.js',
            '../config/legacy/eslintrc-typescript.js',
            '../config/legacy/eslintrc-test.js'
        ]
    },
    prodCode: {
        extends: [
            '../config/legacy/eslintrc-common.js',
            '../config/legacy/eslintrc-typescript.js',
            '../config/legacy/eslintrc-prod.js'
        ]
    },
    flat: {
        defaultTS: {
            extends: [
                '../config/flat/eslintrc-common.js',
                '../config/flat/eslintrc-typescript.js',
                '../config/flat/eslintrc-prod.js',
                '../config/flat/eslintrc-test.js'
            ],
            parser: '@typescript-eslint/parser' // override parser used in eslint-plugin-fiori-custom to support TS
        },
        defaultJS: {
            extends: [
                '../config/flat/eslintrc-common.js',
                '../config/flat/eslintrc-prod.js',
                '../config/flat/eslintrc-test.js'
            ]
        },
        testCode: {
            extends: [
                '../config/flat/eslintrc-common.js',
                '../config/flat/eslintrc-typescript.js',
                '../config/flat/eslintrc-test.js'
            ]
        },
        prodCode: {
            extends: [
                '../config/flat/eslintrc-common.js',
                '../config/flat/eslintrc-typescript.js',
                '../config/flat/eslintrc-prod.js'
            ]
        }
    }
};

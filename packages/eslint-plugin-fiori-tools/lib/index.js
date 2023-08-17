"use strict";
//------------------------------------------------------------------------------
// Plugin Definition
//------------------------------------------------------------------------------
module.exports.configs = {
    defaultTS: {
        extends: ['../eslintrc-common.js', '../eslintrc-typescript.js', '../eslintrc-prod.js', '../eslintrc-test.js'],
        parser: '@typescript-eslint/parser' // override parser used in eslint-plugin-fiori-custom to support TS
    },
    defaultJS: {
        extends: ['../eslintrc-common.js', '../eslintrc-prod.js', '../eslintrc-test.js']
    },
    testCode: {
        extends: ['../eslintrc-common.js', '../eslintrc-typescript.js', '../eslintrc-test.js']
    },
    prodCode: {
        extends: ['../eslintrc-common.js', '../eslintrc-typescript.js', '../eslintrc-prod.js']
    }
};
//# sourceMappingURL=index.js.map
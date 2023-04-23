/**
 * @fileoverview eslint for fiori tools
 * @author @sap-ux
 */
'use strict';

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

//------------------------------------------------------------------------------
// Plugin Definition
//------------------------------------------------------------------------------

module.exports.configs = {
    default: {
        extends: ['../eslintrc-common.js', '../eslintrc-typescript.js', '../eslintrc-prod.js', '../eslintrc-test.js']
    },
    testcode: {
        extends: ['../eslintrc-common.js', '../eslintrc-typescript.js', '../eslintrc-test.js']
    },
    prodCode: {
        extends: ['../eslintrc-common.js', '../eslintrc-typescript.js', '../eslintrc-prod.js']
    }
};

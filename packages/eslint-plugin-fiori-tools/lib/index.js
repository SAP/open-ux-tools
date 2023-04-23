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
const commonConfig = require('../eslintrc-common.js');
const typescriptConfig = require('../eslintrc-typescript.js');
const prodConfig = require('../eslintrc-prod.js');
const testConfig = require('../eslintrc-test.js');
module.exports = {
    configs: {
        default: {
            ...commonConfig,
            ...typescriptConfig,
            ...prodConfig,
            ...testConfig
        },
        testCode: {
            ...commonConfig,
            ...typescriptConfig,
            ...testConfig
        },
        prodCode: {
            ...commonConfig,
            ...typescriptConfig,
            ...prodConfig
        }
    }
};

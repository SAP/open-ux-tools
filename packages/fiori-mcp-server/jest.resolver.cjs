'use strict';
const path = require('path');

// @sap/ux-cds-compiler-facade loads via ESM static import from fiori-annotation-api.
// Jest's --experimental-vm-modules cannot extract named exports from .cjs files for static
// ESM imports, so we route all requests to the .mjs mock with proper ESM named exports.
// The CJS require chain (ux-specification → fe-fpm-writer → fiori-annotation-api →
// @sap/ux-cds-compiler-facade) is broken by the fe-fpm-writer CJS stub below.
const MOCK_DIR = path.join(__dirname, 'test', '__mocks__', '@sap');
const MOCK_SAP_UX_DIR = path.join(__dirname, 'test', '__mocks__', '@sap-ux');

module.exports = (request, options) => {
    if (request === '@sap/ux-cds-compiler-facade') {
        return path.join(MOCK_DIR, 'ux-cds-compiler-facade.mjs');
    }
    // When @sap-ux/fe-fpm-writer is require()-d from a CJS bundle (e.g. via ux-specification
    // → fe-fpm-writer → fiori-annotation-api), route to the empty CJS stub to break the
    // chain. ESM static imports are handled by moduleNameMapper → fe-fpm-writer.mjs.
    if (request === '@sap-ux/fe-fpm-writer') {
        return path.join(MOCK_SAP_UX_DIR, 'fe-fpm-writer.cjs');
    }
    return options.defaultResolver(request, options);
};

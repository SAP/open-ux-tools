'use strict';
const path = require('path');

// @sap/ux-cds-compiler-facade loads via ESM static import from fiori-annotation-api.
// Jest's --experimental-vm-modules cannot extract named exports from .cjs files for static
// ESM imports, so we route all requests to the .mjs mock with proper ESM named exports.
// The CJS require chain (ux-specification → fe-fpm-writer → fiori-annotation-api →
// @sap/ux-cds-compiler-facade) is broken by the fe-fpm-writer stub in moduleNameMapper.
const MOCK_DIR = path.join(__dirname, 'test', '__mocks__', '@sap');

module.exports = (request, options) => {
    if (request === '@sap/ux-cds-compiler-facade') {
        return path.join(MOCK_DIR, 'ux-cds-compiler-facade.mjs');
    }
    return options.defaultResolver(request, options);
};

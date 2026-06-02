'use strict';
const path = require('path');

// @sap/ux-cds-compiler-facade (CJS) requires @sap-ux/project-access which is ESM-only.
// Map it to the bundled CJS proxy from fiori-annotation-api so the CDS compiler can
// load without CJS-require-ESM errors under Jest's --experimental-vm-modules.
const CJS_PROXY = path.join(__dirname, '..', 'fiori-annotation-api', 'test', '__cjs-proxies', 'project-access.cjs');
const ESM_TO_CJS = {
    '@sap-ux/project-access': CJS_PROXY
};

module.exports = (request, options) => {
    if (options.conditions && options.conditions.includes('require') && ESM_TO_CJS[request]) {
        return ESM_TO_CJS[request];
    }
    return options.defaultResolver(request, options);
};

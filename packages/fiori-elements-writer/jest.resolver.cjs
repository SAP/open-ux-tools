/**
 * Custom Jest resolver to handle ESM workspace packages loaded via require() by CJS node_modules.
 *
 * Problem: @sap/ux-cds-compiler-facade (CJS) calls require() on @sap-ux/odata-annotation-core-types
 * which is ESM ("type": "module"). Jest throws "Must use import to load ES Module".
 *
 * Solution: When a require() condition is detected for known ESM workspace packages,
 * redirect to a CJS proxy file that exports an empty object.
 */
const path = require('path');

const CJS_PROXY = path.join(__dirname, 'test', '__cjs-proxies', 'empty.cjs');

const ESM_PACKAGES = [
    '@sap-ux/odata-annotation-core-types',
    '@sap-ux/odata-annotation-core',
    '@sap-ux/project-access'
];

module.exports = (request, options) => {
    if (options.conditions && options.conditions.includes('require') && ESM_PACKAGES.includes(request)) {
        return CJS_PROXY;
    }
    return options.defaultResolver(request, options);
};

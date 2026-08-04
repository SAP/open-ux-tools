const path = require('path');
const CJS_PROXY_DIR = path.join(__dirname, 'test', '__cjs-proxies');
const ESM_TO_CJS = {
    // project-access has ESM-only code (import.meta) so we need a bundled CJS proxy
    '@sap-ux/project-access': path.join(CJS_PROXY_DIR, 'empty.cjs')
    // odata-annotation-core-types and odata-annotation-core now have native CJS exports
    // via their exports field, so they don't need proxies
};
module.exports = (request, options) => {
    if (options.conditions && options.conditions.includes('require') && ESM_TO_CJS[request]) {
        return ESM_TO_CJS[request];
    }
    return options.defaultResolver(request, options);
};

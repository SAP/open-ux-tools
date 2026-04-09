const path = require('path');
const CJS_PROXY_DIR = path.join(__dirname, 'test', '__cjs-proxies');
const ESM_TO_CJS = {
    '@sap-ux/odata-annotation-core-types': path.join(CJS_PROXY_DIR, 'odata-annotation-core-types.cjs'),
    '@sap-ux/odata-annotation-core': path.join(CJS_PROXY_DIR, 'odata-annotation-core.cjs'),
    '@sap-ux/project-access': path.join(CJS_PROXY_DIR, 'project-access.cjs')
};
module.exports = (request, options) => {
    if (options.conditions && options.conditions.includes('require') && ESM_TO_CJS[request]) {
        return ESM_TO_CJS[request];
    }
    return options.defaultResolver(request, options);
};

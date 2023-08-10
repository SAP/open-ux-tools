import { generateProxyMiddlewareOptions, createProxy, initI18n } from './base/proxy';

export { generateProxyMiddlewareOptions, createProxy };

initI18n().catch(() => {
    // Ignore any errors since the middleware will still work
});

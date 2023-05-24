import { generateProxyMiddlewareOptions, createProxy, initI18n } from './base/proxy';

export { generateProxyMiddlewareOptions, createProxy };

initI18n().catch(() => {
    // cannot do anything about it but the write will still work
});

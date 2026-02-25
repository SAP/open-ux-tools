import { generateProxyMiddlewareOptions, createProxy, initI18n } from './base/proxy';

export { generateProxyMiddlewareOptions, createProxy };
export type { BackendConfig } from './base/types';

initI18n().catch(() => {
    // Ignore any errors since the middleware will still work
});

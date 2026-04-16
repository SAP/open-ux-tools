import { generateProxyMiddlewareOptions, createProxy, initI18n } from './base/proxy.js';

export { generateProxyMiddlewareOptions, createProxy };
export type {
    LocalBackendConfig,
    DestinationBackendConfig,
    BackendConfig,
    BackendMiddlewareConfig
} from './base/types.js';

initI18n().catch(() => {
    // Ignore any errors since the middleware will still work
});

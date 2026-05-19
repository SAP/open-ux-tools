import { generateProxyMiddlewareOptions, createProxy, initI18n } from './base/proxy.js';

export { generateProxyMiddlewareOptions, createProxy };
export type {
    LocalBackendConfig,
    DestinationBackendConfig,
    BackendConfig,
    BackendMiddlewareConfig
} from './base/types.js';

void initI18n().catch(() => undefined);

import { generateProxyMiddlewareOptions, createProxy, initI18n } from './base/proxy.js';

export { generateProxyMiddlewareOptions, createProxy };
export type {
    LocalBackendConfig,
    DestinationBackendConfig,
    BackendConfig,
    BackendMiddlewareConfig
} from './base/types.js';

try {
    await initI18n();
} catch {
    // Ignore - module will work with fallback strings
}

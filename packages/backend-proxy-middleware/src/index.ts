import { initI18n } from './base/proxy';

export { generateProxyMiddlewareOptions, createProxy } from './base/proxy';
export type {
    LocalBackendConfig,
    DestinationBackendConfig,
    BackendConfig,
    BackendMiddlewareConfig
} from './base/types';

initI18n().catch(() => {
    // Ignore any errors since the middleware will still work
});

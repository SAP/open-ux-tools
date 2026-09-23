// CLASSIFICATION: [OPEN]
import type { FioriToolsProxyConfigBackend } from '@sap-ux/ui5-config';
import type { TemplateData } from '../types.js';

/**
 * Build main backend configuration from template data
 *
 * Creates the primary backend configuration if proxy path and host are configured.
 *
 * @param templateData - Template data containing UI5 YAML configuration
 * @returns Backend configuration or undefined if not configured
 */
export function buildMainBackend(templateData: TemplateData): FioriToolsProxyConfigBackend | undefined {
    if (!templateData.ui5Yaml?.proxyPath || !templateData.ui5Yaml?.proxyHost) {
        return undefined;
    }

    const backend: FioriToolsProxyConfigBackend = {
        path: templateData.ui5Yaml.proxyPath,
        url: templateData.ui5Yaml.proxyHost
    };

    // Add optional properties
    if (templateData.ui5Yaml.client) {
        backend.client = templateData.ui5Yaml.client;
    }
    if (templateData.ui5Yaml.apiHubApiKey) {
        backend.apiHub = true;
    }
    if (templateData.ui5Yaml.scp) {
        backend.scp = templateData.ui5Yaml.scp;
    }
    if (templateData.ui5Yaml.destination) {
        backend.destination = templateData.ui5Yaml.destination;
    }
    if (templateData.ui5Yaml.destinationInstance) {
        backend.destinationInstance = templateData.ui5Yaml.destinationInstance;
    }

    return backend;
}

/**
 * Build proxy configuration for fiori-tools-proxy middleware
 *
 * @param backends - Array of backend configurations
 * @param templateData - Template data containing UI5 configuration
 * @param setUI5Version - Whether to include UI5 version in config
 * @returns Complete proxy configuration object
 */
export function buildProxyConfig(
    backends: FioriToolsProxyConfigBackend[],
    templateData: TemplateData,
    setUI5Version?: boolean
) {
    const proxyConfig: any = {
        ignoreCertErrors: false,
        backend: backends,
        ui5: {
            path: ['/resources', '/test-resources'],
            url: templateData.ui5Yaml?.ui5Url || ''
        }
    };

    // Note: DO NOT add ui5.version here - it breaks UI5 resource loading.
    // The proxy middleware should always read the version from manifest.json.
    // The setUI5Version parameter is used elsewhere (manifest updates, ui5-mock.yaml)
    // but must not affect ui5.yaml proxy configuration.

    return proxyConfig;
}

/**
 * Build custom middleware configuration for preview
 *
 * @param templateData - Template data containing app ID and theme
 * @returns Array of custom middleware configurations
 */
export function buildPreviewMiddleware(templateData: TemplateData): any[] | undefined {
    if (!templateData.ui5Yaml?.appId) {
        return undefined;
    }

    return [
        {
            name: 'fiori-tools-preview',
            afterMiddleware: 'fiori-tools-appreload',
            configuration: {
                component: templateData.ui5Yaml.appId,
                ui5Theme: templateData.ui5Yaml?.ui5Theme || 'sap_horizon'
            }
        }
    ];
}

/**
 * Adapter for @sap-ux/ui5-config package
 *
 * This adapter wraps the @sap-ux/ui5-config builder to generate ui5.yaml
 * files using the standard open-ux-tools package instead of custom templates.
 *
 * Phase 1 of refactoring: Replace custom ui5Config.ts with this adapter.
 */

import { UI5Config } from '@sap-ux/ui5-config';
import type { FioriToolsProxyConfig, FioriToolsProxyConfigBackend } from '@sap-ux/ui5-config';
import { parse, stringify } from 'yaml';
import { setWebappPath, setAppreloadPath } from '../data/yaml.js';
import type { TemplateData, BackendConfig, NeoappDestination, Message } from '../types.js';
import { updateNeoYamlBackends, updateYamlBackends } from '../config/backend.js';
import { buildMainBackend, buildProxyConfig, buildPreviewMiddleware } from './ui5-config-helpers.js';

/**
 * Generate ui5.yaml content using @sap-ux/ui5-config builder
 *
 * @param templateData - Migration template data containing project configuration
 * @param neoappDestinations - Optional array of neo-app destinations
 * @param messages - Array to collect warning messages
 * @param destination - Selected destination name
 * @param firstNeoAppDestination - First neo-app destination name
 * @param webappPath - Optional webapp path for builder configuration
 * @param setUI5Version - Whether to set UI5 version in proxy middleware
 * @returns Promise resolving to ui5.yaml content as string
 */
export async function generateUI5YamlContent(
    templateData: TemplateData,
    neoappDestinations?: NeoappDestination[],
    messages?: Message[],
    destination?: string,
    firstNeoAppDestination?: string,
    webappPath?: string,
    setUI5Version?: boolean
): Promise<string> {
    const config = await UI5Config.newInstance('', { validateSchema: false });

    // Set metadata and type
    config.setMetadata({
        name: templateData.ui5Yaml?.name?.toLowerCase() || templateData.project.name?.toLowerCase() || 'app'
    });
    config.setType('application');

    // Build backend configuration using helpers
    let backends: FioriToolsProxyConfigBackend[] = [];

    // Add main backend if configured
    const mainBackend = buildMainBackend(templateData);
    if (mainBackend) {
        backends.push(mainBackend);
    }

    // Handle neo-app destinations if provided (uses existing helper logic)
    if (neoappDestinations && neoappDestinations.length > 0) {
        const tempBackendConfigs = updateNeoYamlBackends(
            neoappDestinations,
            backends as unknown as BackendConfig[],
            templateData,
            messages || [],
            destination || '',
            firstNeoAppDestination
        );
        backends = tempBackendConfigs as unknown as FioriToolsProxyConfigBackend[];
    }

    // Apply additional backend processing (uses existing helper logic)
    if (backends.length > 0) {
        const proxyConfigTemp = { backend: backends as unknown as BackendConfig[] };
        const processed = updateYamlBackends(proxyConfigTemp, templateData);
        backends = processed.backend;
    }

    // Add fiori-tools-proxy middleware with all backends
    const proxyConfig: FioriToolsProxyConfig = buildProxyConfig(backends, templateData, setUI5Version);
    config.addFioriToolsProxyMiddleware(proxyConfig);

    // Add fiori-tools-appreload middleware
    config.addFioriToolsAppReloadMiddleware();

    // Add fiori-tools-preview middleware if configured
    const previewMiddleware = buildPreviewMiddleware(templateData);
    if (previewMiddleware) {
        config.addCustomMiddleware(previewMiddleware);
    }

    let yamlContent = config.toString();

    // Apply post-processing for webappPath if provided
    if (webappPath) {
        const yamlJson = parse(yamlContent);
        setWebappPath(yamlJson, webappPath);
        setAppreloadPath(yamlJson, webappPath);
        yamlContent = stringify(yamlJson);
    }

    return yamlContent;
}

/**
 * Generate ui5-local.yaml content using @sap-ux/ui5-config builder
 *
 * @param templateData - Migration template data containing project configuration
 * @param neoappDestinations - Optional array of neo-app destinations
 * @param messages - Array to collect warning messages
 * @param destination - Selected destination name
 * @param firstNeoAppDestination - First neo-app destination name
 * @param webappPath - Optional webapp path for builder configuration
 * @returns Promise resolving to ui5-local.yaml content as string
 */
export async function generateUI5LocalYamlContent(
    templateData: TemplateData,
    neoappDestinations?: NeoappDestination[],
    messages?: Message[],
    destination?: string,
    firstNeoAppDestination?: string,
    webappPath?: string
): Promise<string> {
    // ui5-local.yaml is similar to ui5.yaml but for local development
    // Uses same logic as generateUI5YamlContent (without setUI5Version)
    return generateUI5YamlContent(
        templateData,
        neoappDestinations,
        messages,
        destination,
        firstNeoAppDestination,
        webappPath,
        false // Don't set UI5 version in local yaml
    );
}

/**
 * Generate ui5-mock.yaml content using @sap-ux/ui5-config builder
 *
 * @param templateData - Migration template data containing project configuration
 * @param webappPath - Optional webapp path for builder configuration
 * @param setUI5Version - Whether to set UI5 version in proxy middleware
 * @returns Promise resolving to ui5-mock.yaml content as string
 */
export async function generateUI5MockYamlContent(
    templateData: TemplateData,
    webappPath?: string,
    setUI5Version?: boolean
): Promise<string> {
    const config = await UI5Config.newInstance('', { validateSchema: false });

    // Set metadata and type
    config.setMetadata({
        name: templateData.ui5Yaml?.name?.toLowerCase() || templateData.project.name?.toLowerCase() || 'app'
    });
    config.setType('application');

    // Add fiori-tools-proxy middleware with UI5 version if provided
    const proxyConfig: FioriToolsProxyConfig = {
        ignoreCertErrors: false,
        backend: [],
        ui5: {
            path: ['/resources', '/test-resources'],
            url: templateData.ui5Yaml?.ui5Url || ''
        }
    };

    // Add UI5 version to proxy if provided and setUI5Version is true
    if (setUI5Version && templateData.ui5Yaml?.ui5Version) {
        proxyConfig.ui5!.version = templateData.ui5Yaml.ui5Version;
    }

    config.addFioriToolsProxyMiddleware(proxyConfig);

    // Add fiori-tools-appreload middleware
    config.addFioriToolsAppReloadMiddleware();

    let yamlContent = config.toString();

    // Apply post-processing for webappPath if provided
    if (webappPath) {
        const yamlJson = parse(yamlContent);
        setWebappPath(yamlJson, webappPath);
        setAppreloadPath(yamlJson, webappPath);
        yamlContent = stringify(yamlJson);
    }

    return yamlContent;
}

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
 * Options for generating UI5 YAML content
 */
export interface UI5YamlOptions {
    /** Migration template data containing project configuration */
    templateData: TemplateData;
    /** Optional array of neo-app destinations */
    neoappDestinations?: NeoappDestination[];
    /** Array to collect warning messages */
    messages?: Message[];
    /** Selected destination name */
    destination?: string;
    /** First neo-app destination name */
    firstNeoAppDestination?: string;
    /** Optional webapp path for builder configuration */
    webappPath?: string;
    /** Whether to set UI5 version in proxy middleware */
    setUI5Version?: boolean;
    /** Enable strict validation mode (WARNING becomes ERROR) */
    strict?: boolean;
}

/**
 * Add sap-fe-mockserver middleware to the YAML configuration
 *
 * @param orderedYaml - YAML object to modify
 * @param templateData - Template data with mockserver configuration
 */
function addMockserverMiddleware(orderedYaml: any, templateData: TemplateData): void {
    if (!orderedYaml.server) {
        orderedYaml.server = { customMiddleware: [] };
    }
    if (!orderedYaml.server.customMiddleware) {
        orderedYaml.server.customMiddleware = [];
    }

    const mockserverMiddleware = {
        name: 'sap-fe-mockserver',
        beforeMiddleware: 'fiori-tools-proxy',
        configuration: {
            service: {
                urlBasePath: templateData.ui5Yaml?.servicePath,
                name: templateData.ui5Yaml?.serviceName ?? '',
                metadataXmlPath: templateData.ui5Yaml?.metadataXmlPath || '',
                mockdataRootPath: templateData.ui5Yaml?.mockdataRootPath || '',
                generateMockData: templateData.ui5Yaml?.generateMockData
            }
        }
    };

    // Find index of fiori-tools-proxy and insert before it
    const proxyIndex = orderedYaml.server.customMiddleware.findIndex(
        (mw: { name: string }) => mw.name === 'fiori-tools-proxy'
    );
    if (proxyIndex >= 0) {
        orderedYaml.server.customMiddleware.splice(proxyIndex, 0, mockserverMiddleware);
    } else {
        // If proxy not found, add at beginning
        orderedYaml.server.customMiddleware.unshift(mockserverMiddleware);
    }
}

/**
 * Create a new UI5Config instance with metadata and type pre-configured.
 *
 * @param templateData - Template data providing the config name
 * @returns Configured UI5Config instance
 */
async function createBaseConfig(templateData: TemplateData): Promise<InstanceType<typeof UI5Config>> {
    const config = await UI5Config.newInstance('', { validateSchema: false });
    config.setMetadata({
        name: templateData.ui5Yaml?.name?.toLowerCase() || templateData.project.name?.toLowerCase() || 'app'
    });
    config.setType('application');
    return config;
}

/**
 * Post-process a UI5Config YAML string: add specVersion 4.0 at the top and
 * optionally set webapp and appreload paths.
 *
 * @param yamlContent - Raw YAML string from UI5Config.toString()
 * @param webappPath - Optional webapp path to inject
 * @returns Final YAML string with specVersion and optional paths applied
 */
function postProcessYaml(yamlContent: string, webappPath?: string): string {
    const yamlJson = parse(yamlContent);
    const orderedYaml: any = { specVersion: '4.0' };
    Object.keys(yamlJson).forEach((key) => {
        orderedYaml[key] = yamlJson[key];
    });
    if (webappPath) {
        setWebappPath(orderedYaml, webappPath);
        setAppreloadPath(orderedYaml, webappPath);
    }
    return stringify(orderedYaml);
}

/**
 * Build backend configuration from template data and neo-app destinations
 *
 * @param templateData - Template data with backend configuration
 * @param neoappDestinations - Optional array of neo-app destinations
 * @param messages - Array to collect warning messages
 * @param destination - Selected destination name
 * @param firstNeoAppDestination - First neo-app destination name
 * @param strict - Enable strict validation mode
 * @returns Array of backend configurations
 */
function buildBackendConfigs(
    templateData: TemplateData,
    neoappDestinations?: NeoappDestination[],
    messages?: Message[],
    destination?: string,
    firstNeoAppDestination?: string,
    strict = false
): FioriToolsProxyConfigBackend[] {
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
            firstNeoAppDestination,
            strict
        );
        backends = tempBackendConfigs as unknown as FioriToolsProxyConfigBackend[];
    }

    // Apply additional backend processing (uses existing helper logic)
    if (backends.length > 0) {
        const proxyConfigTemp = { backend: backends as unknown as BackendConfig[] };
        const processed = updateYamlBackends(proxyConfigTemp, templateData);
        backends = processed.backend;
    }

    return backends;
}

/**
 * Generate ui5.yaml content using @sap-ux/ui5-config builder
 *
 * @param options - UI5 YAML generation options
 * @returns Promise resolving to ui5.yaml content as string
 */
export async function generateUI5YamlContent(options: UI5YamlOptions): Promise<string> {
    const {
        templateData,
        neoappDestinations,
        messages,
        destination,
        firstNeoAppDestination,
        webappPath,
        setUI5Version,
        strict = false
    } = options;

    const config = await createBaseConfig(templateData);

    // Build backend configuration using helpers
    const backends = buildBackendConfigs(
        templateData,
        neoappDestinations,
        messages,
        destination,
        firstNeoAppDestination,
        strict
    );

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

    return postProcessYaml(config.toString(), webappPath);
}

/**
 * Generate ui5-local.yaml content using @sap-ux/ui5-config builder
 *
 * ui5-local.yaml differs from ui5.yaml in that it:
 * - Does not set UI5 version in proxy middleware (relies on local framework)
 * - May include sap-fe-mockserver middleware for mock data
 *
 * Note: Both ui5.yaml and ui5-local.yaml include framework section with SAPUI5 libraries
 * when localUI5Version and sapUiLibs are provided. The @sap-ux/ui5-config library
 * auto-adds the framework section based on these settings.
 *
 * @param options - UI5 YAML generation options (setUI5Version is ignored for local yaml)
 * @returns Promise resolving to ui5-local.yaml content as string
 */
export async function generateUI5LocalYamlContent(options: UI5YamlOptions): Promise<string> {
    const {
        templateData,
        neoappDestinations,
        messages,
        destination,
        firstNeoAppDestination,
        webappPath,
        strict = false
    } = options;

    const config = await createBaseConfig(templateData);

    // Add framework section with SAPUI5 libraries (ui5-local.yaml specific)
    if (templateData.project.localUI5Version && templateData.ui5Yaml?.sapUiLibs) {
        const libraries = [...templateData.ui5Yaml.sapUiLibs];
        const theme = templateData.ui5Yaml?.ui5Theme || 'sap_horizon';

        // Note: addUI5Framework automatically appends the theme library based on the theme parameter,
        // so we don't need to manually add it to the libraries array
        config.addUI5Framework('SAPUI5', templateData.project.localUI5Version, libraries, theme);
    }

    // Build backend configuration using helpers
    const backends = buildBackendConfigs(
        templateData,
        neoappDestinations,
        messages,
        destination,
        firstNeoAppDestination,
        strict
    );

    // Add fiori-tools-proxy middleware with all backends (no UI5 version, no ui5 proxy section for local)
    const proxyConfig: FioriToolsProxyConfig = {
        ignoreCertErrors: false,
        backend: backends
    };
    config.addFioriToolsProxyMiddleware(proxyConfig);

    // Add fiori-tools-appreload middleware
    config.addFioriToolsAppReloadMiddleware();

    // Add fiori-tools-preview middleware if configured
    const previewMiddleware = buildPreviewMiddleware(templateData);
    if (previewMiddleware) {
        config.addCustomMiddleware(previewMiddleware);
    }

    const yamlContent = config.toString();
    const yamlJson = parse(yamlContent);
    const orderedYaml: any = { specVersion: '4.0' };
    Object.keys(yamlJson).forEach((key) => {
        orderedYaml[key] = yamlJson[key];
    });

    // Add sap-fe-mockserver middleware if generateMockData is defined (ui5-local.yaml specific)
    if (templateData.ui5Yaml?.generateMockData !== undefined && templateData.ui5Yaml?.servicePath) {
        addMockserverMiddleware(orderedYaml, templateData);
    }

    // Apply webappPath if provided
    if (webappPath) {
        setWebappPath(orderedYaml, webappPath);
        setAppreloadPath(orderedYaml, webappPath);
    }

    return stringify(orderedYaml);
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
    const config = await createBaseConfig(templateData);

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

    return postProcessYaml(config.toString(), webappPath);
}

import type { FioriToolsProxyConfigBackend } from '@sap-ux/ui5-config';
import type { TemplateData, ProjectFolder } from '../types.js';
import { getReuseLibs, ReuseLibType } from '../utils/file-discovery.js';
import { relative, dirname } from 'node:path';
import { URI } from 'vscode-uri';

/**
 * Build reuse libraries shims configuration for ui5.yaml customConfiguration
 *
 * Maps reuse library names from manifest dependencies to their local paths in the workspace.
 * This allows the UI5 loader to resolve reuse libraries locally instead of trying to fetch
 * them from the backend.
 *
 * @param templateData - Template data containing project info with reuseLibs
 * @param projectRoot - Root path of the project being migrated
 * @param workspaceFolders - Workspace folders to search for reuse libraries
 * @returns Shims configuration object or undefined if no reuse libs
 */
export async function buildReuseLibsShims(
    templateData: TemplateData,
    projectRoot: string,
    workspaceFolders?: readonly ProjectFolder[]
): Promise<{ reuseLibs?: Record<string, string[]> } | undefined> {
    // Check if project has reuse library dependencies
    const reuseLibsString = templateData.project.reuseLibs;
    if (!reuseLibsString || !workspaceFolders || workspaceFolders.length === 0) {
        return undefined;
    }

    // Parse comma-separated reuse library names
    const reuseLibNames = reuseLibsString
        .split(',')
        .map((name: string) => name.trim())
        .filter((name: string) => name.length > 0);

    if (reuseLibNames.length === 0) {
        return undefined;
    }

    try {
        // Convert ProjectFolder[] to format expected by getReuseLibs
        const workspaceFoldersWithUri = workspaceFolders.map((folder) => ({
            uri: URI.file(folder.uri.fsPath),
            name: folder.name,
            index: folder.index
        }));

        // Discover all reuse libraries in the workspace
        const discoveredLibs = await getReuseLibs(workspaceFoldersWithUri);
        const reuseLibraries = discoveredLibs.filter((lib) => lib.value.type === ReuseLibType.LIBRARY);

        if (reuseLibraries.length === 0) {
            return undefined;
        }

        // Build shims mapping: library name -> relative path from project root
        const reuseLibs: Record<string, string[]> = {};

        for (const libName of reuseLibNames) {
            // Find the discovered library matching this name
            const matchedLib = reuseLibraries.find((lib) => lib.value.name === libName);

            if (matchedLib) {
                // Calculate relative path from project root to library root
                const libRoot = matchedLib.value.libRoot;
                const manifestDir = dirname(matchedLib.value.path);

                // Use the manifest directory as the library path (contains src/ with the library code)
                const relativePath = relative(projectRoot, manifestDir);

                // Shims expect array of paths (supports multiple locations)
                reuseLibs[libName] = [relativePath || '.'];
            }
        }

        // Only return if we found at least one library
        if (Object.keys(reuseLibs).length === 0) {
            return undefined;
        }

        return { reuseLibs };
    } catch (error) {
        // If reuse lib discovery fails, return undefined to skip shims configuration
        // The app may still work if libraries are available via backend
        return undefined;
    }
}

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

    // Add UI5 version to proxy config when setUI5Version is true
    // This matches the behavior in tools-suite master for ui5-mock.yaml
    // Skip if version is a placeholder/fallback value like "snapshot-version"
    if (setUI5Version && templateData.ui5Yaml?.ui5Version) {
        const version = templateData.ui5Yaml.ui5Version;
        // Only add real versions, not placeholder values
        if (version && !version.includes('snapshot-version')) {
            proxyConfig.ui5.version = version;
        }
    }

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

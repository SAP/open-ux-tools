import { i18nText } from '../i18n.js';
import type { BackendConfig, Message, NeoappDestination, TemplateData } from '../types.js';

/**
 * Updates YAML backends by removing default /sap backend if no datasource exists
 * and adding backends for service paths that don't start with /sap
 *
 * @param proxyConfigInput - The proxy configuration input
 * @param templateData - Template data containing service information
 * @returns Updated proxy configuration
 */
export function updateYamlBackends(proxyConfigInput: any, templateData: TemplateData): any {
    const proxyConfig = { ...proxyConfigInput };
    // remove backend if project has no datasource for default entry /sap
    if (
        proxyConfig?.backend?.[0]?.path === '/sap' &&
        !proxyConfig?.backend?.[0]?.destination?.length &&
        !templateData.ui5Yaml?.proxyHost
    ) {
        proxyConfig.backend = proxyConfig.backend.slice(1); //remove first item
        if (proxyConfig.backend.length === 0) {
            delete proxyConfig.backend;
        }
    }
    // if uri does not start with /sap then add a backend to match the URI
    const matchingBackends = proxyConfig?.backend?.filter((backendObjTmp: { path: string }) =>
        templateData.service.servicePath?.startsWith(backendObjTmp.path)
    );
    // only add a backend for the service path if no matching backends exist
    if (matchingBackends?.length === 0) {
        proxyConfig?.backend?.forEach((backendObj: BackendConfig) => {
            if (
                backendObj?.path === '/sap' &&
                templateData.service?.servicePath &&
                !templateData.service.servicePath.startsWith('/sap')
            ) {
                const odataBackend = { ...backendObj };
                odataBackend.path = templateData.service.servicePath;
                proxyConfig.backend.push(odataBackend);
            }
        });
    }
    return proxyConfig;
}

/**
 * Updates Neo YAML backends from neo-app destinations
 *
 * @param neoappDestinations - Array of neo-app destinations
 * @param proxyBackend - Existing proxy backend configurations
 * @param templateData - Template data containing UI5 YAML information
 * @param messages - Array to collect warning messages
 * @param destination - Selected destination name
 * @param firstNeoAppDestination - First neo-app destination (optional)
 * @returns Array of updated backend configurations
 */
export function updateNeoYamlBackends(
    neoappDestinations: NeoappDestination[],
    proxyBackend: BackendConfig[],
    templateData: TemplateData,
    messages: Message[],
    destination: string | undefined,
    firstNeoAppDestination?: string
): BackendConfig[] {
    let backendRoutes: BackendConfig[] = [];
    let noBackendURL = false;
    const noUrlMessage: Message = {
        type: 'WARNING',
        description: i18nText('MIGRATION_NO_BACKEND_URL'),
        messageUrl:
            'https://help.sap.com/docs/SAP_FIORI_tools/17d50220bcd848aa854c9c182d65b699/70d41f3ee29d453a90efab3ce025d450.html'
    };
    neoappDestinations?.forEach((neoappDestination: NeoappDestination) => {
        const backend: BackendConfig = {
            path: neoappDestination.path,
            destination: neoappDestination.name,
            url: ''
        };
        if (destination === backend.destination || firstNeoAppDestination === backend.destination) {
            //destination from the webview
            backend.url = templateData.ui5Yaml?.proxyHost;
            backend.destination = templateData.ui5Yaml?.destination;
            if (templateData.ui5Yaml?.client !== '') {
                backend.client = templateData.ui5Yaml?.client;
            }
        }
        if (!backend.url) {
            noBackendURL = true;
        }
        if (neoappDestination.path !== neoappDestination.entryPath) {
            backend.pathPrefix = neoappDestination.entryPath;
        }
        backendRoutes.push(backend);
    });
    if (noBackendURL && !messages?.some((message) => message.description === noUrlMessage.description)) {
        messages.push(noUrlMessage);
    }
    backendRoutes = proxyBackend.concat(backendRoutes);
    return backendRoutes;
}

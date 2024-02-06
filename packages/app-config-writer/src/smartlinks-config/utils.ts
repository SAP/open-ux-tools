import type { AxiosBasicCredentials } from 'axios';
import { cyan } from 'chalk';
import { render } from 'ejs';
import type { Editor } from 'mem-fs-editor';
import { join } from 'path';
import type { ServiceProvider } from '@sap-ux/axios-extension';
import { createForAbap, createForDestination } from '@sap-ux/axios-extension';
import { isAppStudio } from '@sap-ux/btp-utils';
import type { ToolsLogger } from '@sap-ux/logger';
import { FileName } from '@sap-ux/project-access';
import { BackendSystemKey, getService } from '@sap-ux/store';
import type { BackendSystem } from '@sap-ux/store';
import { t } from '../i18n';
import { getTemplatePath } from '../templates';
import type {
    InboundTargetsConfig,
    SmartLinksSandboxConfig,
    SystemDetailsResponse,
    TargetConfig,
    TargetMapping
} from '../types';
import { addUi5YamlServeStaticMiddleware, readUi5DeployConfigTarget } from './ui5-yaml';

/**
 * URL parameters for call to backend
 */
const UrlParameters = {
    so: '*',
    action: '*',
    systemAliasesFormat: 'object',
    'sap-language': 'EN',
    shellType: 'FLP',
    depth: 0
};

/**
 * Check the secure storage if it has credentials for the entered url.
 *
 * @param url target system url
 * @param client optional sap-client parameter
 * @param logger Logger for user output
 * @returns credentials or undefined
 */
export async function getLocalStoredCredentials(
    url: string,
    client?: string,
    logger?: ToolsLogger
): Promise<AxiosBasicCredentials | undefined> {
    // check if system credentials are stored in the store
    try {
        const systemStore = await getService<BackendSystem, BackendSystemKey>({ logger, entityName: 'system' });
        const system = await systemStore.read(new BackendSystemKey({ url, client }));
        return system?.username ? { username: system.username, password: system.password || '' } : undefined;
    } catch (error) {
        logger?.warn(t('warnings.useCredentialsFailed'));
        logger?.debug(error as object);
    }
    return undefined;
}

/**
 * Creates and returns a service provider.
 *
 * @param config configuration with target, authentication and ignoreCertErrors flag
 * @returns service provider
 */
function createSmartLinksProvider(config: TargetConfig) {
    const { target, auth, ignoreCertErrors } = config;
    let provider: ServiceProvider;
    if (isAppStudio() && target.destination) {
        provider = createForDestination({ auth }, { Name: target.destination });
        delete provider.defaults.params['saml2'];
    } else {
        provider = createForAbap({
            baseURL: target.url,
            auth,
            ignoreCertErrors,
            params: target.client ? { 'sap-client': target.client } : undefined
        });
    }
    return provider;
}

/**
 * Sends a request to a target and returns the result.
 *
 * @param config target and credentials to be used for request
 * @param logger logger to report info to the user
 * @returns response from service provider
 */
export async function sendRequest(config: TargetConfig, logger?: ToolsLogger): Promise<SystemDetailsResponse> {
    const target = isAppStudio() && config.target.destination ? config.target.destination : config.target.url;
    if (!target) {
        throw Error(t('error.target'));
    }
    try {
        const provider = createSmartLinksProvider(config);
        logger?.info(`${cyan(t('info.connectTo'))} ${target}`);
        const response = await provider.get('/sap/bc/ui2/start_up', { params: UrlParameters });
        logger?.info(cyan(t('info.connectSuccess')));
        return JSON.parse(response.data);
    } catch (error: any) {
        logger?.debug(error);
        throw Error(error.message);
    }
}

/**
 * Get target definition of deploy system as source for smartlinks configuration.
 *
 * @param basePath - path to project root, where ui5-deploy.yaml is
 * @param logger - logger
 * @returns target definition
 */
export async function getTargetDefinition(basePath: string, logger?: ToolsLogger): Promise<TargetConfig | undefined> {
    logger?.info(t('info.searchTarget', { file: FileName.UI5DeployYaml }));
    try {
        const target = await readUi5DeployConfigTarget(basePath);
        logger?.info(cyan(t('info.targetFound', { file: FileName.UI5DeployYaml })));
        return target;
    } catch (err: any) {
        logger?.warn(err.message);
        logger?.debug(err);
        return undefined;
    }
}

/**
 * Sends a request and returns the target mappings.
 *
 * @param config service and credentials to be used for request
 * @param logger logger
 * @returns target mappings result from service
 */
async function getTargetMappings(
    config: TargetConfig,
    logger?: ToolsLogger
): Promise<{ [key: string]: TargetMapping }> {
    const response: SystemDetailsResponse | undefined = await sendRequest(config, logger);
    if (!response?.targetMappings) {
        throw Error(t('error.noTarget'));
    }
    return response.targetMappings;
}

/**
 * Receives and maps targets from service to template for further consumption.
 *
 * @param config service and credentials to be used for request
 * @param logger logger
 * @returns config with targets to be used for template mapping
 */
export async function getTargetMappingsConfig(
    config: TargetConfig,
    logger?: ToolsLogger
): Promise<InboundTargetsConfig> {
    const targetMappings = await getTargetMappings(config, logger);
    const inboundConfig: InboundTargetsConfig = {};
    for (const targetName in targetMappings) {
        const target = targetMappings[targetName];
        inboundConfig[targetName] = {
            semanticObject: target.semanticObject,
            action: target.semanticAction,
            title: target.text,
            signature: {
                additionalParameters: 'ignored',
                parameters: {},
                ...target.signature
            },
            resolutionResult: {}
        };
    }
    return inboundConfig;
}

/**
 * Maps service targets to existing targets in appconfig sandboxConfig file.
 *
 * @param appConfigPath path to apps appconfig/fioriSandboxConfig.json file
 * @param inboundTargets returned targets from service
 * @param fs - the memfs editor instance
 * @returns merged inbound targets
 */
function mergeTargetMappings(
    appConfigPath: string,
    inboundTargets: InboundTargetsConfig,
    fs: Editor
): InboundTargetsConfig {
    const existingConfig = fs.readJSON(appConfigPath) as SmartLinksSandboxConfig;
    const existingTargets = existingConfig.services?.ClientSideTargetResolution?.adapter?.config?.inbounds;
    if (existingTargets) {
        Object.entries(inboundTargets).forEach(([name, value]) => {
            existingTargets[name] = value;
        });
        return existingTargets;
    }
    return inboundTargets;
}

/**
 * Add or enhance appconfig smartlinks configuration.
 *
 * @param basePath - the base path of the application
 * @param config - configuration of the target system for smartlinks
 * @param fs - the memfs editor instance
 * @param logger - logger
 */
export async function writeSmartLinksConfig(
    basePath: string,
    config: TargetConfig,
    fs: Editor,
    logger?: ToolsLogger
): Promise<void> {
    let inboundTargets = await getTargetMappingsConfig(config, logger);
    const templatePath = getTemplatePath('smartlinks-config/fioriSandboxConfig.json');
    const appConfigPath = join(basePath, 'appconfig', 'fioriSandboxConfig.json');
    if (!fs.exists(appConfigPath)) {
        fs.copyTpl(templatePath, appConfigPath, { inboundTargets });
    } else {
        inboundTargets = mergeTargetMappings(appConfigPath, inboundTargets, fs);
        const filledTemplate = render(fs.read(templatePath), { inboundTargets }, {});
        fs.extendJSON(appConfigPath, JSON.parse(filledTemplate));
    }
    await addUi5YamlServeStaticMiddleware(basePath, fs, logger);
}

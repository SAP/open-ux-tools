import type { AxiosBasicCredentials } from 'axios';
import { cyan } from 'chalk';
import { render } from 'ejs';
import { Agent as HttpsAgent } from 'https';
import type { Editor } from 'mem-fs-editor';
import { join } from 'path';
import { create } from '@sap-ux/axios-extension';
import type { ToolsLogger } from '@sap-ux/logger';
import { FileName } from '@sap-ux/project-access';
import type { BackendSystem } from '@sap-ux/store';
import { BackendSystemKey, getService } from '@sap-ux/store';
import type {
    BasicTarget,
    DeployTarget,
    InboundTargetsConfig,
    SmartLinksSandboxConfig,
    SystemDetailsResponse,
    TargetConfig,
    TargetMapping
} from '../types';
import { t } from '../i18n';
import { promptUserPass } from '../prompt';
import { getTemplatePath } from '../templates';
import { UrlParameters } from '../types';
import { readUi5DeployConfigTarget } from './ui5-yaml';

/**
 * @description Check the secure storage if it has credentials for the entered url.
 * @param url target system url
 * @param client optional sap-client parameter
 * @returns credentials or undefined
 */
export async function getSystemCredentials(url: string, client?: string): Promise<AxiosBasicCredentials | undefined> {
    const systemService = await getService<BackendSystem, BackendSystemKey>({ entityName: 'system' });
    const system = await systemService.read(new BackendSystemKey({ url, client }));
    return system?.username ? { username: system.username, password: system.password || '' } : undefined;
}

/**
 * @description Returns stored credentials or prompt for credentials input
 * @param target target parameters to be checked for existing credentials
 * @param logger logger to report info to the user
 * @returns stored credentials or from prompt
 */
export async function getCredentials(
    target: BasicTarget,
    logger?: ToolsLogger
): Promise<AxiosBasicCredentials | undefined> {
    return (await getSystemCredentials(target.url, target.client)) || promptUserPass(logger);
}

/**
 * @description Combines the target parameters and returns the target url
 * @param target target information with optional sap-client
 * @returns target url to be called for smartlinks config
 */
function getSmartLinksTargetUrl(target: DeployTarget | BasicTarget) {
    let appendUrl = Object.values(UrlParameters).join('&');
    if (target.client) {
        appendUrl = `${appendUrl}&sap-client=${target.client}`;
    }
    return `${target.url}${appendUrl}`;
}

/**
 * @description Sends a request to a target and returns the result
 * @param config target and credentials to be used for request
 * @param logger logger to report info to the user
 * @returns response from service provider
 */
export async function sendRequest(config: TargetConfig, logger?: ToolsLogger): Promise<SystemDetailsResponse> {
    const httpsAgent = new HttpsAgent({ rejectUnauthorized: !config.ignoreCertError });
    const requestConfig = { auth: config.credentials, httpsAgent };
    const service = create({ baseURL: config.target.url, ...requestConfig });
    try {
        const targetUrl = getSmartLinksTargetUrl(config.target);
        logger?.info(`${cyan(t('info.connectTo'))} ${targetUrl}`);
        const response = await service.get(targetUrl, requestConfig);
        logger?.info(cyan(t('info.connectSuccess')));
        return JSON.parse(response.data);
    } catch (error: any) {
        logger?.debug(error);
        throw Error(error.message);
    }
}

/**
 * @description Get target definition of deploy system as source for smartlinks configuration.
 * @param basePath - path to project root, where ui5-deploy.yaml is
 * @param logger - logger
 */
export async function getTargetDefinition(basePath: string, logger?: ToolsLogger): Promise<TargetConfig | undefined> {
    try {
        logger?.info(t('info.searchTarget', { file: FileName.UI5DeployYaml }));
        const targets = await readUi5DeployConfigTarget(basePath);
        logger?.info(cyan(t('info.targetFound', { file: FileName.UI5DeployYaml })));
        return targets;
    } catch (err: any) {
        logger?.warn(err.message);
        logger?.debug(err);
        return undefined;
    }
}

/**
 * @description Sends a request and returns the target mappings
 * @param config service and credentials to be used for request
 * @param logger logger
 * @returns target mappings result from service
 */
async function getTargetMappings(
    config: TargetConfig,
    logger?: ToolsLogger
): Promise<{ [key: string]: TargetMapping }> {
    const response: SystemDetailsResponse | undefined = await sendRequest(config, logger);
    if (!response || !response.targetMappings) {
        throw Error(t('error.noSmartlinkTargets'));
    }
    return response.targetMappings;
}

/**
 * @description Receives and maps targets from service to template for further consumption
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
            title: target.title,
            signature: target.signature,
            resolutionResult: {}
        };
    }
    return inboundConfig;
}

/**
 * @description Maps service targets to existing targets in appconfig sandboxConfig file
 * @param appConfigPath path to apps appconfig/fioriSandboxConfig.json file
 * @param inboundTargets returned targets from service
 * @param fs - the memfs editor instance
 */
export function mergeTargetMappings(appConfigPath: string, inboundTargets: InboundTargetsConfig, fs: Editor): void {
    const existingConfig = fs.readJSON(appConfigPath) as SmartLinksSandboxConfig;
    const existingTargets = existingConfig.services?.ClientSideTargetResolution?.adapter?.config?.inbounds;
    if (existingTargets) {
        Object.entries(inboundTargets).forEach(([name, value]) => {
            existingTargets[name] = value;
        });
        inboundTargets = existingTargets;
    }
}

/**
 * @description Add or enhance appconfig smartlinks configuration.
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
    const inboundTargets = await getTargetMappingsConfig(config, logger);
    const templatePath = getTemplatePath('smartlinks-config/fioriSandboxConfig.json');
    const appConfigPath = join(basePath, 'appconfig', 'fioriSandboxConfig.json');
    if (!fs.exists(appConfigPath)) {
        fs.copyTpl(templatePath, appConfigPath, { inboundTargets });
    } else {
        mergeTargetMappings(appConfigPath, inboundTargets, fs);
        const filledTemplate = render(fs.read(templatePath), { inboundTargets }, {});
        fs.extendJSON(appConfigPath, JSON.parse(filledTemplate));
    }
}

import type { AxiosBasicCredentials } from 'axios';
import type { BackendSystem } from '@sap-ux/store';
import { BackendSystemKey, getService } from '@sap-ux/store';
import type { ToolsLogger } from '@sap-ux/logger';
import type {
    InboundTargetsConfig,
    ServiceConfig,
    SmartLinksSandboxConfig,
    SystemDetailsResponse,
    TargetMapping
} from '../types';
import { t } from '../i18n';
import { promptUserPass } from '../prompt';
import { sendRequest } from './service';
import type { Editor } from 'mem-fs-editor';
import { getTemplatePath } from '../templates';
import { join } from 'path';
import { render } from 'ejs';

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
 * @param service service parameters to be checked for existing credentials
 * @param logger logger to report info to the user
 * @returns stored credentials or from prompt
 */
export async function getCredentials(
    service: ServiceConfig,
    logger?: ToolsLogger
): Promise<AxiosBasicCredentials | undefined> {
    return (await getSystemCredentials(service.url, service.client)) || promptUserPass(logger);
}

/**
 * @description Sends a request and returns the target mappings
 * @param config service and credentials to be used for request
 * @param logger logger
 * @returns target mappings result from service
 */
async function getTargetMappings(
    config: ServiceConfig,
    logger?: ToolsLogger
): Promise<{ [key: string]: TargetMapping }> {
    const response: SystemDetailsResponse | undefined = await sendRequest(config, config.credentials, logger);
    if (!response || !response.targetMappings) {
        throw Error(t('error.noTargets'));
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
    config: ServiceConfig,
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
 * @param service - Configuration of a target system
 * @param fs - the memfs editor instance
 * @param logger - logger
 */
export async function writeSmartLinksConfig(
    basePath: string,
    service: ServiceConfig,
    fs: Editor,
    logger?: ToolsLogger
): Promise<void> {
    const inboundTargets = await getTargetMappingsConfig(service, logger);
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

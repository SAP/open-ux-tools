import { existsSync } from 'fs';
import { join } from 'path';
import type { Editor } from 'mem-fs-editor';
import type { ToolsLogger } from '@sap-ux/logger';
import { FileName } from '@sap-ux/project-access';
import type { AbapDeployConfig, FioriToolsProxyConfig } from '@sap-ux/ui5-config';
import { UI5Config } from '@sap-ux/ui5-config';
import type { ServiceConfig } from '../types';
import { DeployConfig } from '../types';

/**
 * @description - reads and returns target information from ui5.yaml, if existing
 * @param fs - mem-fs reference to be used for file access
 * @param basePath - path to project root, where ui5-deploy.yaml is
 * @param logger - logger
 * @returns {ServiceConfig[]} target url and client for deploy configuration
 */
export async function readUi5Config(
    fs: Editor,
    basePath: string,
    logger?: ToolsLogger
): Promise<ServiceConfig[] | undefined> {
    const ui5YamlFilePath = join(basePath, FileName.Ui5Yaml);
    if (!existsSync(ui5YamlFilePath)) {
        logger?.debug(`File '${FileName.Ui5Yaml}' does not exist.`);
        return undefined;
    }
    const ui5YamlConfig = await UI5Config.newInstance(fs.read(ui5YamlFilePath));
    const customMiddleware = ui5YamlConfig.findCustomMiddleware<FioriToolsProxyConfig>(DeployConfig.FioriToolsProxy);
    const appServices: ServiceConfig[] = [];
    if (customMiddleware) {
        for (const backendConfig of customMiddleware.configuration.backend || []) {
            if (backendConfig.url) {
                appServices.push({ ...backendConfig });
            }
        }
    }
    return appServices;
}

/**
 * @description - reads and returns target information from ui5-deploy.yaml, if existing
 * @param fs - mem-fs reference to be used for file access
 * @param basePath - path to project root, where ui5-deploy.yaml is
 * @param logger - logger
 * @returns {ServiceConfig} target url and client for deploy configuration
 */
export async function readUi5DeployConfig(
    fs: Editor,
    basePath: string,
    logger?: ToolsLogger
): Promise<ServiceConfig | undefined> {
    const ui5YamlFilePath = join(basePath, FileName.UI5DeployYaml);
    if (!existsSync(ui5YamlFilePath)) {
        logger?.debug(`File '${FileName.UI5DeployYaml}' does not exist.`);
        return undefined;
    }
    const ui5DeployYamlConfig = await UI5Config.newInstance(fs.read(ui5YamlFilePath));
    const customTask = ui5DeployYamlConfig.findCustomTask<AbapDeployConfig>(DeployConfig.DeployToAbap);
    if (!customTask?.configuration?.target?.url) {
        logger?.info(`No target url found in ${FileName.UI5DeployYaml}`);
        return undefined;
    }
    return { ...customTask.configuration.target, url: customTask.configuration.target.url };
}

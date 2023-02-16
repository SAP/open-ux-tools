import { existsSync } from 'fs';
import { join } from 'path';
import type { Editor } from 'mem-fs-editor';
import type { ToolsLogger } from '@sap-ux/logger';
import { FileName } from '@sap-ux/project-access';
import type {
    AbapDeployConfig,
    CustomMiddleware,
    FioriToolsProxyConfig,
    FioriToolsServeStaticConfig,
    FioriToolsServeStaticPath
} from '@sap-ux/ui5-config';
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
export async function readUi5ConfigTargets(
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
                appServices.push({ ...backendConfig, ignoreCertError: customMiddleware.configuration.ignoreCertError });
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
export async function readUi5DeployConfigTargets(
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

/**
 * @description Checks if 'fiori-tools-servestatic' configuration is already existing
 * @param existingPaths existing configuration paths under 'fiori-tools-servestatic'
 * @returns 'fiori-tools-servestatic' configuration, if not existing yet
 */
const getFioriToolsServeStaticMiddlewareConfig = (
    existingPaths: FioriToolsServeStaticPath[]
): CustomMiddleware<FioriToolsServeStaticConfig> | undefined => {
    const configPath: FioriToolsServeStaticPath = { path: '/appconfig', src: 'appconfig', fallthrough: false };
    if (existingPaths.find((existing) => existing.path === configPath.path && existing.src === configPath.src)) {
        return undefined;
    }
    const paths = [...existingPaths, configPath];
    return {
        name: 'fiori-tools-servestatic',
        beforeMiddleware: 'fiori-tools-proxy',
        configuration: { paths }
    };
};

/**
 * @description - reads and adds servestatic configuration to ui5/-local/-mock.yaml files
 * @param basePath - path to project root, where ui5.yaml is
 * @param fs - mem-fs reference to be used for file access
 * @param logger - logger
 */
export async function enhanceUi5Yamls(basePath: string, fs: Editor, logger?: ToolsLogger): Promise<void> {
    const ui5Yamls = [FileName.Ui5Yaml, FileName.Ui5MockYaml, FileName.Ui5LocalYaml];
    for (const ui5Yaml of ui5Yamls) {
        const ui5YamlFilePath = join(basePath, ui5Yaml);
        if (!existsSync(ui5YamlFilePath)) {
            logger?.debug(`File '${ui5Yaml}' does not exist.`);
            continue;
        }
        const ui5YamlConfig = await UI5Config.newInstance(fs.read(ui5YamlFilePath));
        const appServeStaticMiddleware = ui5YamlConfig.findCustomMiddleware<FioriToolsServeStaticConfig>(
            DeployConfig.FioriToolsServestatic
        );
        const middleware = getFioriToolsServeStaticMiddlewareConfig(
            appServeStaticMiddleware?.configuration.paths || []
        );
        if (middleware) {
            const yamlConfig = ui5YamlConfig.updateCustomMiddleware(middleware);
            const yaml = yamlConfig.toString();
            fs.write(ui5YamlFilePath, yaml);
        }
    }
}

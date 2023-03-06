import type { Editor } from 'mem-fs-editor';
import { join } from 'path';
import type { ToolsLogger } from '@sap-ux/logger';
import { FileName, readUi5Yaml } from '@sap-ux/project-access';
import type {
    AbapDeployConfig,
    CustomMiddleware,
    FioriToolsProxyConfig,
    FioriToolsServeStaticConfig,
    FioriToolsServeStaticPath,
    UI5Config
} from '@sap-ux/ui5-config';
import { t } from '../i18n';
import type { TargetConfig } from '../types';
import { DeployConfig } from '../types';

/**
 * @description - reads and returns target information from ui5-deploy.yaml, if existing
 * @param basePath - path to project root, where ui5-deploy.yaml is
 * @returns {TargetConfig} target definition for deploy configuration
 */
export async function readUi5DeployConfigTarget(basePath: string): Promise<TargetConfig> {
    const ui5DeployYaml = await readUi5Yaml(basePath, FileName.UI5DeployYaml);
    const customTask = ui5DeployYaml.findCustomTask<AbapDeployConfig>(DeployConfig.DeployToAbap);
    if (!customTask?.configuration?.target) {
        throw Error(t('error.noTarget', { file: `(${FileName.UI5DeployYaml})` }));
    }
    const { target, ignoreCertError } = customTask?.configuration;
    return { target, ignoreCertErrors: ignoreCertError };
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
export async function addUi5YamlServeStaticMiddleware(
    basePath: string,
    fs: Editor,
    logger?: ToolsLogger
): Promise<void> {
    const ui5Yamls = [FileName.Ui5Yaml, FileName.Ui5MockYaml, FileName.Ui5LocalYaml];
    for (const ui5Yaml of ui5Yamls) {
        let ui5YamlConfig: UI5Config;
        try {
            ui5YamlConfig = await readUi5Yaml(basePath, ui5Yaml);
        } catch (error) {
            logger?.debug(`File ${ui5Yaml} not existing`);
            continue;
        }
        if (!ui5YamlConfig.findCustomMiddleware<FioriToolsProxyConfig>(DeployConfig.FioriToolsProxy)) {
            ui5YamlConfig.addFioriToolsProxydMiddleware({ ui5: {} });
        }
        const appServeStaticMiddleware = ui5YamlConfig.findCustomMiddleware<FioriToolsServeStaticConfig>(
            DeployConfig.FioriToolsServestatic
        );
        const middleware = getFioriToolsServeStaticMiddlewareConfig(
            appServeStaticMiddleware?.configuration.paths || []
        );
        if (middleware) {
            const yamlConfig = ui5YamlConfig.updateCustomMiddleware(middleware);
            const yaml = yamlConfig.toString();
            fs.write(join(basePath, ui5Yaml), yaml);
        }
    }
}

/**
 * @description - removes servestatic configuration from ui5/-local/-mock.yaml files
 * @param basePath - path to project root, where ui5.yaml is
 * @param fs - mem-fs reference to be used for file access
 * @param logger - logger
 */
export async function removeUi5YamlServeStaticMiddleware(
    basePath: string,
    fs: Editor,
    logger?: ToolsLogger
): Promise<void> {
    const ui5Yamls = [FileName.Ui5Yaml, FileName.Ui5MockYaml, FileName.Ui5LocalYaml];
    for (const ui5Yaml of ui5Yamls) {
        let ui5YamlConfig: UI5Config;
        try {
            ui5YamlConfig = await readUi5Yaml(basePath, ui5Yaml);
        } catch (error) {
            logger?.debug(`File ${ui5Yaml} not existing`);
            continue;
        }
        const appServeStaticMiddleware = ui5YamlConfig.findCustomMiddleware<FioriToolsServeStaticConfig>(
            DeployConfig.FioriToolsServestatic
        );
        if (appServeStaticMiddleware) {
            ui5YamlConfig.removeCustomMiddleware(DeployConfig.FioriToolsServestatic);
            const yaml = ui5YamlConfig.toString();
            fs.write(join(basePath, ui5Yaml), yaml);
        }
    }
}

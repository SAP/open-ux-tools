import { isAppStudio } from '@sap-ux/btp-utils';
import { UI5Config } from '@sap-ux/ui5-config';
import { UI5_TASK_FLATTEN_LIB } from './constants';
import type { Editor } from 'mem-fs-editor';
import type { AbapDeployConfig, AbapTarget, FioriToolsProxyConfig } from '@sap-ux/ui5-config';

/**
 * Updates the base config with the required custom tasks.
 *
 * @param basePath - the base path
 * @param baseConfig - the base config
 * @param fs - the memfs editor instance
 */
export function updateBaseConfig(basePath: string, baseConfig: UI5Config, fs: Editor) {
    if (baseConfig.getType() === 'library') {
        const customTask = {
            name: UI5_TASK_FLATTEN_LIB,
            afterTask: 'generateResourcesJson'
        };
        baseConfig.addCustomTasks([customTask]);
        fs.write(basePath, baseConfig.toString());
        baseConfig.removeConfig('builder');
    }
}

/**
 * Returns the deployment config.
 *
 * @param config - the deploy config
 * @param baseConfig - the base config
 * @returns the deploy config
 */
export async function getDeployConfig(config: AbapDeployConfig, baseConfig: UI5Config): Promise<UI5Config> {
    const target: Partial<AbapTarget> = {};

    if (config.target.destination !== undefined) {
        target.destination = config.target.destination;
    }
    if (config.target.url !== undefined) {
        target.url = config.target.url;
    }
    if (config.target.client) {
        target.client = config.target.client;
    }
    if (config.target.scp) {
        target.scp = true;
    }

    if (!isAppStudio()) {
        const middleware = baseConfig.findCustomMiddleware<FioriToolsProxyConfig>('fiori-tools-proxy');
        if (middleware?.configuration?.backend?.[0].authenticationType === 'reentranceTicket') {
            target.authenticationType = 'reentranceTicket';
        }
    }
    const baseUi5Doc = baseConfig.removeConfig('server');
    const ui5DeployConfig = await UI5Config.newInstance(baseUi5Doc.toString());

    ui5DeployConfig.addComment({
        comment: ' yaml-language-server: $schema=https://sap.github.io/ui5-tooling/schema/ui5.yaml.json',
        location: 'beginning'
    });

    ui5DeployConfig.addAbapDeployTask(target as unknown as AbapTarget, config.app, true, ['/test/'], config.index);

    return ui5DeployConfig;
}

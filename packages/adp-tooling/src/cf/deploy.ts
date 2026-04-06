import path from 'node:path';
import { CommandRunner } from '@sap-ux/nodejs-utils';
import { getMtaPath } from '@sap-ux/project-access';
import { isCfInstalled } from './services/cli';
import { isLoggedInCf } from './core/auth';
import { loadCfConfig } from './core/config';
import { getYamlContent } from './project/yaml-loader';
import { t } from '../i18n';
import type { CfConfig, CfDeploymentInfo, DeployCfOptions, MtaYaml } from '../types';
import type { ToolsLogger } from '@sap-ux/logger';

const SEPARATOR = '------------------------------------';

/**
 * Gathers MTA project and CF environment information needed for deployment.
 *
 * @param {string} projectPath - Path to the MTA project root (containing mta.yaml).
 * @param {CfConfig} cfConfig - The CF configuration.
 * @returns {CfDeploymentInfo} Deployment information for the MTA project.
 */
export function getCfDeploymentInfo(projectPath: string, cfConfig: CfConfig): CfDeploymentInfo {
    const mtaYamlPath = path.join(projectPath, 'mta.yaml');
    const mtaYaml = getYamlContent<MtaYaml>(mtaYamlPath);

    return {
        mtaProjectName: mtaYaml.ID ?? '',
        mtaVersion: mtaYaml.version ?? '',
        space: cfConfig.space?.Name ?? '',
        org: cfConfig.org?.Name ?? '',
        apiUrl: cfConfig.url ?? '',
        mtaRoot: projectPath,
        modules:
            mtaYaml.modules?.map((m) => ({
                name: m.name,
                type: m.type,
                path: m.path
            })) ?? []
    };
}

/**
 * Formats the deployment summary for console output.
 *
 * @param {CfDeploymentInfo} info - The deployment information to format.
 * @returns {string} Formatted summary string ready for display.
 */
export function formatDeploymentSummary(info: CfDeploymentInfo): string {
    const lines: string[] = [];

    lines.push(
        `mta-project-name: ${info.mtaProjectName}`,
        `mta-version: ${info.mtaVersion}`,
        `space: ${info.space}`,
        `org: ${info.org}`,
        `api-url: ${info.apiUrl}`
    );

    for (const mod of info.modules) {
        lines.push(SEPARATOR, `project name: ${mod.name}`, `type: ${mod.type}`);
        if (mod.path) {
            lines.push(`path: ${mod.path}`);
        }
    }

    lines.push('', t('deploy.confirmPrompt'));

    return lines.join('\n');
}

/**
 * Finds the MTA project root by recursively searching the given path and its ancestors for mta.yaml.
 *
 * @param {string} projectPath - The starting project path.
 * @returns {Promise<string | undefined>} The MTA root path, or undefined if not found.
 */
export async function findMtaRoot(projectPath: string): Promise<string | undefined> {
    const result = await getMtaPath(projectPath);
    return result ? path.dirname(result.mtaPath) : undefined;
}

/**
 * Validates the CF environment: checks CF CLI is installed, user is logged in, and locates the MTA root.
 *
 * @param {string} projectPath - Path to the ADP project root.
 * @param {ToolsLogger} logger - Logger instance.
 * @returns {Promise<{ cfConfig: CfConfig; mtaRoot: string }>} The validated CF config and MTA root path.
 */
async function validateCfEnvironment(
    projectPath: string,
    logger: ToolsLogger
): Promise<{ cfConfig: CfConfig; mtaRoot: string }> {
    const cfInstalled = await isCfInstalled(logger);
    if (!cfInstalled) {
        throw new Error(t('deploy.cfNotInstalled'));
    }

    const cfConfig = loadCfConfig(logger);
    const loggedIn = await isLoggedInCf(cfConfig, logger);
    if (!loggedIn) {
        throw new Error(t('deploy.notLoggedIn'));
    }

    const mtaRoot = await findMtaRoot(projectPath);
    if (!mtaRoot) {
        throw new Error(t('deploy.mtaNotFound', { projectPath }));
    }

    return { cfConfig, mtaRoot };
}

/**
 * Builds the MTA archive by running the project's build-mta npm script.
 *
 * @param {string} projectPath - Path to the ADP project root.
 * @param {ToolsLogger} logger - Logger instance.
 */
export async function buildMtaArchive(projectPath: string, logger: ToolsLogger): Promise<void> {
    const commandRunner = new CommandRunner();
    try {
        await commandRunner.run('npm', ['run', 'build-mta'], { cwd: projectPath }, logger);
    } catch (e) {
        throw new Error(t('deploy.buildFailed', { error: String(e) }));
    }
}

/**
 * Deploys the MTA archive to Cloud Foundry by running the project's deploy npm script.
 *
 * @param {string} projectPath - Path to the ADP project root.
 * @param {ToolsLogger} logger - Logger instance.
 */
export async function deployMtaArchive(projectPath: string, logger: ToolsLogger): Promise<void> {
    const commandRunner = new CommandRunner();
    try {
        await commandRunner.run('npm', ['run', 'deploy'], { cwd: projectPath }, logger);
    } catch (e) {
        throw new Error(t('deploy.deployFailed', { error: String(e) }));
    }
}

/**
 * Deploys a CF ADP project by building the MTA archive and deploying it to Cloud Foundry.
 *
 * @param {string} projectPath - Path to the ADP project root.
 * @param {ToolsLogger} logger - Logger instance.
 * @param {DeployCfOptions} [options] - Deployment options (confirmation callback, output callback).
 * @returns {Promise<void>} Resolves when deployment completes.
 */
export async function deployCf(projectPath: string, logger: ToolsLogger, options: DeployCfOptions = {}): Promise<void> {
    const { cfConfig, mtaRoot } = await validateCfEnvironment(projectPath, logger);

    const info = getCfDeploymentInfo(mtaRoot, cfConfig);
    const summary = formatDeploymentSummary(info);

    const output = options.onOutput ?? ((data: string) => logger.info(data));
    output(summary);

    if (options.confirmDeployment) {
        const confirmed = await options.confirmDeployment(summary);
        if (!confirmed) {
            logger.info(t('deploy.cancelled'));
            return;
        }
    }
    logger.info(t('deploy.buildStarted'));
    await buildMtaArchive(projectPath, logger);

    logger.info(t('deploy.deployStarted'));
    await deployMtaArchive(projectPath, logger);

    logger.info(t('deploy.success'));
}

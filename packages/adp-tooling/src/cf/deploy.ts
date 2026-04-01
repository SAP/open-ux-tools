import path from 'node:path';
import { CommandRunner } from '@sap-ux/nodejs-utils';
import { isCfInstalled } from './services/cli';
import { isLoggedInCf } from './core/auth';
import { loadCfConfig } from './core/config';
import { getYamlContent } from './project/yaml-loader';
import { isMtaProject } from './project/yaml';
import { t } from '../i18n';
import type { CfDeploymentInfo, DeployCfOptions, MtaYaml } from '../types';
import type { ToolsLogger } from '@sap-ux/logger';

const SEPARATOR = '------------------------------------';

/**
 * Gathers MTA project and CF environment information needed for deployment.
 *
 * @param {string} projectPath - Path to the MTA project root (containing mta.yaml).
 * @param {ToolsLogger} [logger] - Optional logger instance.
 * @returns {CfDeploymentInfo} Deployment information for the MTA project.
 */
export function getCfDeploymentInfo(projectPath: string, logger?: ToolsLogger): CfDeploymentInfo {
    if (!isMtaProject(projectPath)) {
        throw new Error(t('deploy.mtaNotFound', { projectPath }));
    }

    const mtaYamlPath = path.join(projectPath, 'mta.yaml');
    const mtaYaml = getYamlContent<MtaYaml>(mtaYamlPath);
    const cfConfig = loadCfConfig(logger);

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

    lines.push(`mta-project-name: ${info.mtaProjectName}`);
    lines.push(`mta-version: ${info.mtaVersion}`);
    lines.push(`space: ${info.space}`);
    lines.push(`org: ${info.org}`);
    lines.push(`api-url: ${info.apiUrl}`);

    for (const mod of info.modules) {
        lines.push(SEPARATOR);
        lines.push(`project name: ${mod.name}`);
        lines.push(`type: ${mod.type}`);
        if (mod.path) {
            lines.push(`path: ${mod.path}`);
        }
    }

    lines.push('');
    lines.push(t('deploy.confirmPrompt'));

    return lines.join('\n');
}

/**
 * Finds the MTA project root by checking the given path and its parent for mta.yaml.
 *
 * @param {string} projectPath - The starting project path.
 * @returns {string | undefined} The MTA root path, or undefined if not found.
 */
export function findMtaRoot(projectPath: string): string | undefined {
    if (isMtaProject(projectPath)) {
        return projectPath;
    }
    const parent = path.dirname(projectPath);
    if (parent !== projectPath && isMtaProject(parent)) {
        return parent;
    }
    return undefined;
}

/**
 * Deploys a CF ADP project by building the MTA archive and deploying it to Cloud Foundry.
 *
 * The function:
 * 1. Validates CF CLI is installed and user is logged in.
 * 2. Locates the MTA root from the given project path.
 * 3. Gathers and displays MTA project attributes.
 * 4. Requests user confirmation (via callback or auto-confirms if no callback provided).
 * 5. Runs `mbt build` to create the MTA archive.
 * 6. Runs `cf deploy` to push the archive to Cloud Foundry.
 *
 * @param {string} projectPath - Path to the ADP project (or MTA root).
 * @param {DeployCfOptions} [options] - Deployment options (confirmation callback, output callback).
 * @param {ToolsLogger} [logger] - Optional logger instance.
 * @returns {Promise<void>} Resolves when deployment completes.
 */
export async function deployCf(
    projectPath: string,
    options: DeployCfOptions = {},
    logger?: ToolsLogger
): Promise<void> {
    const cfInstalled = await isCfInstalled(logger as ToolsLogger);
    if (!cfInstalled) {
        throw new Error(t('deploy.cfNotInstalled'));
    }

    const cfConfig = loadCfConfig(logger);
    const loggedIn = await isLoggedInCf(cfConfig, logger as ToolsLogger);
    if (!loggedIn) {
        throw new Error(t('deploy.notLoggedIn'));
    }

    const mtaRoot = findMtaRoot(projectPath);
    if (!mtaRoot) {
        throw new Error(t('deploy.mtaNotFound', { projectPath }));
    }

    const info = getCfDeploymentInfo(mtaRoot, logger);
    const summary = formatDeploymentSummary(info);

    const output = options.onOutput ?? ((data: string) => logger?.info(data));
    output(summary);

    if (options.confirmDeployment) {
        const confirmed = await options.confirmDeployment(summary);
        if (!confirmed) {
            logger?.info(t('deploy.cancelled'));
            return;
        }
    }

    const commandRunner = new CommandRunner();
    const spawnOpts = { cwd: mtaRoot };
    const mtaArchivePath = path.join(mtaRoot, 'mta_archives', 'archive.mtar');

    logger?.info(t('deploy.buildStarted'));
    try {
        await commandRunner.run('mbt', ['build', '--mtar', 'archive', '--source', mtaRoot], spawnOpts, logger);
    } catch (e) {
        throw new Error(t('deploy.buildFailed', { error: String(e) }));
    }

    logger?.info(t('deploy.deployStarted'));
    try {
        await commandRunner.run('cf', ['deploy', mtaArchivePath], spawnOpts, logger);
    } catch (e) {
        throw new Error(t('deploy.deployFailed', { error: String(e) }));
    }

    logger?.info(t('deploy.success'));
}

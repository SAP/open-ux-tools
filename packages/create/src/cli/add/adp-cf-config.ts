import type { Command } from 'commander';
import { getLogger, traceChanges, setLogLevelVerbose } from '../../tracing';
import { validateBasePath, validateAdpAppType } from '../../validation';
import { isLoggedInCf, loadCfConfig, generateCfConfig } from '@sap-ux/adp-tooling';
import { FileName } from '@sap-ux/project-access';

/**
 * Add the "setup adaptation-project-cf" command to a passed command.
 *
 * @param cmd - commander command for setting up CF adaptation project
 */
export function addAdaptationProjectCFConfigCommand(cmd: Command): void {
    cmd.command('adp-cf-config [path]')
        .description(
            `Configure a Cloud Foundry adaptation project by fetching reusable libraries, building the project, and configuring ui5.yaml.\n
Example:
    \`npx --yes @sap-ux/create@latest add adp-cf-config\``
        )
        .option('-v, --verbose', 'Show verbose information.')
        .option('-c, --config <string>', 'Path to the project configuration file in YAML format.', FileName.Ui5Yaml)
        .action(async (path, options) => {
            if (options.verbose === true) {
                setLogLevelVerbose();
            }
            await setupAdaptationProjectCF(path ?? process.cwd(), options.config);
        });
}

/**
 * Setup a Cloud Foundry adaptation project.
 *
 * @param basePath - path to project root
 * @param yamlPath - path to the project configuration file in YAML format
 */
async function setupAdaptationProjectCF(basePath: string, yamlPath: string): Promise<void> {
    const logger = getLogger();
    await validateBasePath(basePath);
    await validateAdpAppType(basePath);

    const cfConfig = loadCfConfig(logger);

    if (!(await isLoggedInCf(cfConfig, logger))) {
        throw new Error(
            'You are not logged in to Cloud Foundry or your session has expired. Please run "cf login" first.'
        );
    }

    try {
        const fs = await generateCfConfig(basePath, yamlPath, cfConfig, logger);

        await traceChanges(fs);
        await new Promise<void>((resolve, reject) => {
            fs.commit([], (err: Error | null) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    } catch (error) {
        logger.error(`Failed to setup CF adaptation project: ${(error as Error).message}`);
        throw error;
    }
}

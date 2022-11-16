import { execSync } from 'child_process';
import type { Command } from 'commander';
import { prompt } from 'prompts';
import { getWebappPath } from '@sap-ux/project-access';
import { generateMockserverConfig, getMockserverConfigQuestions } from '@sap-ux/mockserver-config-writer';
import type { MockserverConfig } from '@sap-ux/mockserver-config-writer';
import { getLogger, traceChanges, setLogLevelVerbose } from '../../tracing';
import { validateBasePath } from '../../validation';
import { relative } from 'path';

/**
 * Add the "add mockserver config" command to a passed command.
 *
 * @param cmd - commander command for adding mockserver config command
 */
export function addAddMockserverConfigCommand(cmd: Command): void {
    cmd.command('mockserver-config [path]')
        .option('-i, --interactive', 'ask for config options, otherwise use defaults')
        .option('-n, --skip-install', 'skip npm install step')
        .option('-s, --simulate', 'simulate only do not write or install; sets also --verbose')
        .option('-v, --verbose', 'show verbose information')
        .action((path, options) => {
            if (options.verbose === true || options.simulate) {
                setLogLevelVerbose();
            }
            addMockserverConfig(
                path || process.cwd(),
                !!options.simulate,
                !!options.skipInstall,
                !!options.interactive
            );
        });
}

/**
 * Adds a mockserver config to an app or project.
 *
 * @param basePath - path to application root
 * @param simulate - if true, do not write but just show what would be change; otherwise write
 * @param skipInstall - if true, skip execution of npm install
 * @param interactive - if true, prompt user for config options, otherwise use defaults
 */
async function addMockserverConfig(
    basePath: string,
    simulate: boolean,
    skipInstall: boolean,
    interactive: boolean
): Promise<void> {
    const logger = getLogger();
    try {
        logger.debug(
            `Called add mockserver-config for path '${basePath}', simulate is '${simulate}', skip install is '${skipInstall}'`
        );
        validateBasePath(basePath);
        const webappPath = await getWebappPath(basePath);
        const config: MockserverConfig = { webappPath };
        if (interactive) {
            const questions = await getMockserverConfigQuestions(webappPath);
            config.ui5MockYamlConfig = await prompt(questions);
        }
        const fs = await generateMockserverConfig(basePath, config);
        await traceChanges(fs);
        if (!simulate) {
            fs.commit(() => {
                logger.info(`Changes written.`);
                if (skipInstall) {
                    logger.warn('To finish mockserver configuration run commands:');
                    const relPath = relative(basePath, process.cwd());
                    if (relPath) {
                        logger.info(`cd ${relPath}`);
                    }
                    logger.info('npm install -D @sap-ux/ui5-middleware-fe-mockserver');
                } else {
                    runNpmInstall(basePath);
                }
            });
        }
    } catch (error) {
        logger.error(`Error while executing add mockserver-config '${(error as Error).message}'`);
        logger.debug(error as Error);
    }
}

/**
 * Run npm install for mockserver middleware in the root folder of application.
 *
 * @param basePath - path to application root
 */
function runNpmInstall(basePath: string): void {
    const npmCommand = /^win/.test(process.platform) ? 'npm.cmd' : 'npm';
    const dir = process.cwd();
    try {
        process.chdir(basePath);
        execSync(`${npmCommand} install -D @sap-ux/ui5-middleware-fe-mockserver`, { stdio: [0, 1, 2] });
    } finally {
        process.chdir(dir);
    }
}

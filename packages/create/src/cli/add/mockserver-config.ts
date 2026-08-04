import { relative } from 'node:path';
import type { Command } from 'commander';
import { getWebappPath } from '@sap-ux/project-access';
import { generateMockserverConfig, getMockserverConfigQuestions } from '@sap-ux/mockserver-config-writer';
import type { MockserverConfig } from '@sap-ux/mockserver-config-writer';
import { getLogger, traceChanges, setLogLevelVerbose } from '../../tracing/index.js';
import { validateBasePath } from '../../validation/index.js';
import { runNpmInstallCommand } from '../../common/index.js';

/**
 * Add the "add mockserver config" command to a passed command.
 *
 * @param cmd - commander command for adding mockserver config command
 */
export function addAddMockserverConfigCommand(cmd: Command): void {
    cmd.command('mockserver-config [path]')
        .description(
            `Add the necessary configuration for the \`@sap-ux/ui5-middleware-fe-mockserver\` mockserver module to enable local OData mocking.\n
Example:
    \`npx --yes @sap-ux/create@latest add mockserver-config\``
        )
        .option('-i, --interactive', 'Ask for config options or otherwise, use the default options.')
        .option('-n, --skip-install', 'Skip the `npm install` step.')
        .option('-s, --simulate', 'Simulate only. Do not write or install. Also, sets `--verbose`')
        .option('-v, --verbose', 'Show verbose information.')
        .action(async (path, options) => {
            if (options.verbose === true || options.simulate) {
                setLogLevelVerbose();
            }
            await addMockserverConfig(
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
 * @param simulate - if true, do not write but just show what would be changed; otherwise write
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
        await validateBasePath(basePath);
        const webappPath = await getWebappPath(basePath);
        const config: MockserverConfig = { webappPath };
        if (interactive) {
            const questions = getMockserverConfigQuestions({ webappPath, askForOverwrite: true });
            // getMockserverConfigQuestions returns prompts-format questions, convert them on the fly
            const answers: Record<string, any> = {};
            const { input: inquirerInput, confirm: inquirerConfirm } = await import('@inquirer/prompts');
            for (const q of questions) {
                const message = typeof q.message === 'string' ? q.message : String(q.message);
                const qType = typeof q.type === 'string' ? q.type : 'text';
                if (qType === 'text' || qType === 'number') {
                    answers[q.name as string] = await inquirerInput({ message });
                } else if (qType === 'confirm') {
                    answers[q.name as string] = await inquirerConfirm({ message, default: false });
                }
            }
            config.ui5MockYamlConfig = answers;
        }
        const fs = await generateMockserverConfig(basePath, config);
        await traceChanges(fs);
        if (!simulate) {
            await new Promise<void>((resolve) => fs.commit(resolve));
            logger.info(`Changes written.`);
            if (skipInstall) {
                logger.warn('To finish mockserver configuration run commands:');
                const relPath = relative(basePath, process.cwd());
                if (relPath) {
                    logger.info(`cd ${relPath}`);
                }
                logger.info('npm install -D @sap-ux/ui5-middleware-fe-mockserver');
            } else {
                logger.debug('Running npm install command');
                runNpmInstallCommand(basePath, ['--save-dev', '@sap-ux/ui5-middleware-fe-mockserver']);
            }
        }
    } catch (error) {
        logger.error(`Error while executing add mockserver-config '${(error as Error).message}'`);
        logger.debug(error as Error);
    }
}

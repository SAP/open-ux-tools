import { relative } from 'node:path';
import type { Command } from 'commander';
import prompts from 'prompts';
import { execNpmCommand, getWebappPath } from '@sap-ux/project-access';
import { generateMockserverConfig, getMockserverConfigQuestions } from '@sap-ux/mockserver-config-writer';
import type { MockserverConfig } from '@sap-ux/mockserver-config-writer';
import { getLogger, traceChanges, setLogLevelVerbose } from '../../tracing/index.js';
import { validateBasePath } from '../../validation/index.js';

const MOCKSERVER_PACKAGE = '@sap-ux/ui5-middleware-fe-mockserver';
const MOCK_DATA_GENERATOR_PACKAGE = '@sap-ux/mockserver-data-generator';

const { prompt } = prompts;

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
        .option('--data-generator', 'Generate context-aware mock data with MockGen through the standard mockserver.')
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
                !!options.interactive,
                !!options.dataGenerator
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
 * @param dataGenerator - if true, enable the standard mockserver data generator provider
 */
async function addMockserverConfig(
    basePath: string,
    simulate: boolean,
    skipInstall: boolean,
    interactive: boolean,
    dataGenerator: boolean
): Promise<void> {
    const logger = getLogger();
    try {
        logger.debug(
            `Called add mockserver-config for path '${basePath}', simulate is '${simulate}', skip install is '${skipInstall}'`
        );
        await validateBasePath(basePath);
        const webappPath = await getWebappPath(basePath);
        const config: MockserverConfig = { webappPath };
        let enableDataGenerator = dataGenerator;
        if (interactive) {
            const questions = getMockserverConfigQuestions({
                webappPath,
                askForOverwrite: true,
                askForMockDataGenerator: true
            });
            // User responses for webappPath and whether to overwrite existing services in mockserver config
            const answers = await prompt(questions);
            if (answers) {
                const { mockDataGenerator, ...ui5MockYamlConfig } = answers;
                config.ui5MockYamlConfig = ui5MockYamlConfig;
                enableDataGenerator ||= mockDataGenerator === true;
            }
        }
        if (enableDataGenerator) {
            config.ui5MockYamlConfig ??= {};
            config.ui5MockYamlConfig.mockDataGenerator = {};
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
                const packages = [MOCKSERVER_PACKAGE, ...(enableDataGenerator ? [MOCK_DATA_GENERATOR_PACKAGE] : [])];
                logger.info(`npm install -D ${packages.join(' ')}`);
            } else {
                logger.debug('Running npm install command');
                const packages = [MOCKSERVER_PACKAGE, ...(enableDataGenerator ? [MOCK_DATA_GENERATOR_PACKAGE] : [])];
                await execNpmCommand(['install', '--save-dev', ...packages], { cwd: basePath, logger });
                logger.info('npm install completed successfully.');
            }
        }
    } catch (error) {
        logger.error(`Error while executing add mockserver-config '${(error as Error).message}'`);
        logger.debug(error as Error);
    }
}

import { Option, Command } from 'commander';
import { ToolsLogger, ConsoleTransport, LogLevel } from '@sap-ux/logger';
import { deploy, getConfigForLogging, replaceEnvVariables, undeploy, validateConfig } from '../base';
import type { CliOptions } from '../types';
import { NAME } from '../types';
import { getArchive } from './archive';
import { getDeploymentConfig, mergeConfig } from './config';

/**
 * Create an instance of a command runner for deployment.
 *
 * @param name - command name
 * @returns instance of the command
 */
export function createCommand(name: 'deploy' | 'undeploy'): Command {
    const command = new Command()
        .requiredOption('-c, --config <path-to-yaml>', 'Path to config yaml file, default ui5-deploy.yaml')
        .option('-y, --yes', 'yes to all questions', false)
        .option('-v, --verbose', 'verbose log output', false)
        .option('-n, --no-retry', `do not retry if the ${name}ment fails for any reason`, false)
        .version('0.0.1');

    // is this really required or was it a workaround for something in the past?
    //--failfast           -f         Terminate deploy and throw error when encoutering first error (y/N)

    // options to set (or overwrite) values that are otherwise read from the `ui5*.yaml`
    command
        .addOption(new Option('--destination  <destination>', 'Destination in SAP BTP pointing to an ABAP system').conflicts('url'))
        .addOption(new Option('--url <target-url>', 'URL of deploy target ABAP system').conflicts('destination'))
        .addOption(
            new Option('--client <sap-client>', 'Client number of deploy target ABAP system').conflicts('destination')
        )
        .addOption(new Option('--scp', `true for ${name}ments to ABAP on BTP`).conflicts('destination'))
        .option('--transport <transport-request>', 'Transport number to record the change in the ABAP system')
        .option('--name <bsp-name>', 'Project name of the app')
        .option('--strict-ssl', 'Perform certificate validation (use --no-strict-ssl to deactivate it)')
        .option('--test', `Run in test mode. ABAP backend reports ${name}ment errors without actually ${name}ing. (use --no-test to deactivate it)`);

    if (name === 'deploy') {
        // additional parameters for deployment
        command
            .option('--package <abap-package>', 'Package name for deploy target ABAP system')
            .option('--description <description>', 'Project description of the app')
            .option('--keep', 'Keep a copy of the deployed archive in the project folder.');

        // alternatives to provide the archive
        command
            .addOption(
                new Option(
                    '--archive-url <url>',
                    'Download app bundle from this url and upload this bundle for deployment'
                ).conflicts(['archivePath', 'archiveFolder'])
            )
            .addOption(
                new Option('--archive-path <path>', 'Provide path of the app bundle for deployment').conflicts([
                    'archiveUrl',
                    'archiveFolder'
                ])
            )
            .addOption(
                new Option('--archive-folder <path>', 'Provide path to a folder for deployment').conflicts([
                    'archiveUrl',
                    'archivePath'
                ])
            );
    }
    return command;
}

/**
 * Prepare the run of the task based on on the configured command i.e. read and validate configuration and create logger.
 *
 * @param cmd - CLI command condiguration to be executed
 * @returns a set of objects required for the command execution
 */
async function prepareRun(cmd: Command) {
    const options = cmd.parse().opts<CliOptions>();

    const logLevel = options.verbose ? LogLevel.Silly : LogLevel.Info;
    const logger = new ToolsLogger({
        transports: [new ConsoleTransport()],
        logLevel,
        logPrefix: NAME
    });

    const taskConfig = await getDeploymentConfig(options.config);
    const config = await mergeConfig(taskConfig, options);
    if (logLevel >= LogLevel.Debug) {
        logger.debug(getConfigForLogging(config));
    }
    validateConfig(config);
    replaceEnvVariables(config);

    return { cmd, logger, config, options };
}

/**
 * Function that is to be execute when the exposed deploy command is executed.
 */
export async function runDeploy(): Promise<void> {
    const cmd = createCommand('deploy');
    try {
        const { logger, options, config } = await prepareRun(cmd);
        const archive = await getArchive(logger, options);
        await deploy(archive, config, logger);
    } catch (error) {
        cmd.error((error as Error).message);
    }
}

/**
 * Function that is to be execute when the exposed undeploy command is executed.
 */
export async function runUndeploy(): Promise<void> {
    const cmd = createCommand('undeploy');
    try {
        const { logger, config } = await prepareRun(cmd);
        await undeploy(config, logger);
    } catch (error) {
        cmd.error((error as Error).message);
    }
}

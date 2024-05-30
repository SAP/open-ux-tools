import { Option, Command } from 'commander';
import { ToolsLogger, ConsoleTransport, LogLevel } from '@sap-ux/logger';
import { deploy, getConfigForLogging, undeploy, validateConfig } from '../base';
import type { CliOptions, AbapDeployConfig } from '../types';
import { NAME } from '../types';
import { getArchive } from './archive';
import { getDeploymentConfig, getVersion, mergeConfig } from './config';
import { config as loadEnvConfig } from 'dotenv';
import { replaceEnvVariables } from '@sap-ux/ui5-config';

/**
 * Create an instance of a command runner for deployment.
 *
 * @param name - command name
 * @returns instance of the command
 */
export function createCommand(name: 'deploy' | 'undeploy'): Command {
    const command = new Command(name)
        .option('-c, --config <path-to-yaml>', 'Path to config yaml file')
        .option('-y, --yes', 'yes to all questions', false)
        .option('-n, --no-retry', `do not retry if ${name} fails for any reason`, true) // retry by default when true, if passed from cli, will set to false
        .option('--verbose', 'verbose log output', false);

    // options to set (or overwrite) values that are otherwise read from the `ui5*.yaml`
    command
        .addOption(
            new Option('--destination <destination>', 'Destination in SAP BTP pointing to an ABAP system').conflicts(
                'url'
            )
        )
        .addOption(new Option('--url <target-url>', 'URL of target ABAP system').conflicts('destination'))
        .addOption(new Option('--client <sap-client>', 'Client number of target ABAP system').conflicts('destination'))
        .addOption(new Option('--cloud', 'Target is an ABAP Cloud system').conflicts('destination'))
        .addOption(new Option('--service <service-path>', 'Target alias for deployment service'))
        .addOption(new Option('--authentication-type <authentication-type>', 'Authentication type for the app'))
        .addOption(
            new Option(
                '--cloud-service-key <file-location>',
                'JSON file location with the ABAP cloud service key.'
            ).conflicts('destination')
        )
        .addOption(
            new Option(
                '--cloud-service-env',
                'Read ABAP cloud service properties from environment variables or .env file'
            ).conflicts(['cloudServiceKey', 'destination'])
        )
        .option('--package <abap-package>', 'Package name for deploy target ABAP system')
        .option('--transport <transport-request>', 'Transport number to record the change in the ABAP system')
        .addOption(
            new Option('--create-transport', 'Create transport request during deployment').conflicts(['transport'])
        )
        .addOption(
            new Option('--username <username>', 'ABAP System username').conflicts([
                'cloudServiceKey',
                'cloudServiceEnv'
            ])
        )
        .addOption(
            new Option('--password <password>', 'ABAP System password').conflicts([
                'cloudServiceKey',
                'cloudServiceEnv'
            ])
        )
        .option('--name <bsp-name>', 'Project name of the app')
        .option('--no-strict-ssl', 'Deactivate certificate validation', true)
        .option(
            '--query-params <param1=value&param2=value>',
            'Additional parameters that are to be added to calls to the target.'
        )
        .option(
            '--test',
            `Run in test mode. ABAP backend reports ${name}ment errors without actually ${name}ing (use --no-test to deactivate it).`
        );

    if (name === 'deploy') {
        // additional parameters for deployment
        command
            .option('--description <description>', 'Project description of the app')
            // SafeMode: Example: If the deployment would overwrite a repository that contains an app with a different sap.app/id and SafeMode is true, HTTP status code 412 (Precondition Failed) with further information would be returned.
            .option('--safe', 'Prevents accidentally breaking deployments.')
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
    } else if (name === 'undeploy') {
        command.addOption(
            new Option(
                '--lrep <namespace>',
                'Undeploy the given namespace from the layered repository (for adaptation projects)'
            ).conflicts(['test', 'name'])
        );
    }
    return command.version(getVersion(), '-v, --version', 'version of the deploy tooling');
}

/**
 * Prepare the run of the task based on on the configured command i.e. read and validate configuration and create logger.
 *
 * @param cmd - CLI command configuration to be executed
 * @returns a set of objects required for the command execution
 */
async function prepareRun(cmd: Command) {
    if (process.argv.length < 3) {
        cmd.help();
    }
    loadEnvConfig();
    const options = cmd.parse().opts<CliOptions>();
    const logLevel = options.verbose ? LogLevel.Silly : LogLevel.Info;
    const logger = new ToolsLogger({
        transports: [new ConsoleTransport()],
        logLevel,
        logPrefix: NAME
    });

    // Handle empty config when not passed in
    const taskConfig = options.config ? await getDeploymentConfig(options.config) : ({} as AbapDeployConfig);
    const config = await mergeConfig(taskConfig, options);
    if (logLevel >= LogLevel.Debug) {
        logger.debug(getConfigForLogging(config));
    }
    validateConfig(config);
    replaceEnvVariables(config);

    return { cmd, logger, config, options };
}

/**
 * Function that is to be executed when the exposed deploy command is executed.
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
 * Function that is to be executed when the exposed undeploy command is executed.
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

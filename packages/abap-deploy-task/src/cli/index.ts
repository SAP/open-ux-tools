import { program, Option } from 'commander';
import { ToolsLogger, ConsoleTransport, LogLevel } from '@sap-ux/logger';
import { deploy, validateConfig } from '../base';
import type { CliOptions } from '../types';
import { NAME } from '../types';
import { getArchive } from './archive';
import { getDeploymentConfig, mergeConfig } from './config';

program
    .requiredOption('-c, --config <path-to-yaml>', 'Path to deployment config yaml file, default ui5-deploy.yaml')
    .option('-y, --yes', 'yes to all questions', false)
    .option('-v, --verbose', 'verbose log output', false)
    .version('0.0.1');

// is this really required or was it a workaround for something in the past?
//--failfast           -f         Terminate deploy and throw error when encoutering first error (y/N)

// options to set (or overwrite) values that are otherwise read from the `ui5*.yaml`
program
    .addOption(new Option('--destination  <destination>', 'Destination of BTP system').conflicts('url'))
    .addOption(new Option('--url <target-url>', 'URL of deploy target ABAP system').conflicts('destination'))
    .addOption(
        new Option('--client <sap-client>', 'Client number of deploy target ABAP system').conflicts('destination')
    )
    .addOption(new Option('--scp', 'true for deployments to ABAP on BTP').conflicts('destination'))
    .option('--transport <transport-request>', 'Transport number for deploy target ABAP system')
    .option('--name <bsp-name>', 'Project name of the app')
    .option('--package <abap-package>', 'Package name for deploy target ABAP system')
    .option('--description <description>', 'Project description of the app')
    .option('--strict-ssl', ' Perform certificate validation on archive url')
    .option(
        '-t, --test',
        'Run deploy in test mode. ABAP backend reports deploy error without actual deploy the bundle.',
        false
    );

// alternatives to provide the archive
program
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

/**
 * Function that is to be execute when the exposed deploy command is executed.
 */
export async function run(): Promise<void> {
    program.parse();
    const options = program.opts() as CliOptions;
    const logger = new ToolsLogger({
        transports: [new ConsoleTransport()],
        logLevel: options.verbose ? LogLevel.Silly : LogLevel.Info,
        logPrefix: NAME
    });

    try {
        const taskConfig = await getDeploymentConfig(options.config);
        const config = await mergeConfig(taskConfig, options);
        logger.debug(config);
        validateConfig(config);

        const archive = await getArchive(logger, options);
        deploy(archive, config, logger);
    } catch (error) {
        program.error((error as Error).message, { exitCode: 1 });
    }
}

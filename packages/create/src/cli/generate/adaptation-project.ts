import type { Command } from 'commander';
import chalk from 'chalk';
import { getLogger, traceChanges } from '../../tracing';
import type { AdpWriterConfig, PromptDefaults } from '@sap-ux/adp-tooling';
import { promptGeneratorInput, generate, FlexLayer } from '@sap-ux/adp-tooling';
import { runNpmInstallCommand } from '../../common';
import { join } from 'node:path';

/**
 * Add a new sub-command to generate SAP UI5 adaptation projects the given command.
 *
 * @param cmd main command that is to be enhanced
 */
export function addGenerateAdaptationProjectCommand(cmd: Command): void {
    cmd.command('adaptation-project [path]')
        .description(
            `Generate a new SAPUI5 adaptation project with optional prompts and configuration.
                                     Example usage:
                                     \`npx --yes @sap-ux/create@latest generate adaptation-project\``
        )
        .option('-n, --skip-install', 'Skip the `npm install` step.')
        .option('-s, --simulate', 'Simulate only. Do not write or install.')
        .option('-y, --yes', 'Use default values for all prompts.')
        .option('--id [id]', 'The ID of the adaptation project.')
        .option('--reference [reference]', 'The ID of the original application.')
        .option('--url [url]', 'The URL that points to the target system which contains the original application.')
        .option('--ignoreCertErrors', 'Ignore certificate errors when connecting to the target system.')
        .option('--ft', 'Enable SAP Fiori tools for the generated project.')
        .option('--ts', 'Enable TypeScript support for the generated project.')
        .option('--package [package]', 'The ABAP package to be used for deployments.')
        .option('--transport [transport]', 'The ABAP transport to be used for deployments.')
        .action(async (path, options) => {
            console.log(
                `\nThe generation of adaptation projects outside of SAP Business Application Studio is currently ${chalk.bold(
                    'experimental'
                )}.`
            );
            console.log(
                'Please report any issues or feedback at https://github.com/SAP/open-ux-tools/issues/new/choose.\n'
            );
            await generateAdaptationProject(
                path,
                { ...options },
                !!options.yes,
                !!options.simulate,
                !!options.skipInstall
            );
        });
}

/**
 * Generate an SAP UI5 adaptation project based on the given parameters.
 *
 * @param basePath target folder of the new project
 * @param defaults optional defaults
 * @param useDefaults if set to true, then default values are used for all prompts and the prompting is skipped
 * @param simulate if set to true, then no files will be written to the filesystem
 * @param skipInstall if set to true then `npm i` is not executed in the new project
 */
async function generateAdaptationProject(
    basePath: string,
    defaults: PromptDefaults,
    useDefaults: boolean,
    simulate: boolean,
    skipInstall: boolean
): Promise<void> {
    const logger = getLogger();
    try {
        logger.debug(`Called generate adaptation-project for path '${basePath}', skip install is '${skipInstall}'`);
        if (defaults.url) {
            const url = new URL(defaults.url);
            defaults.url = url.origin;
            defaults.client = url.searchParams.get('sap-client') ?? undefined;
        }
        const config = useDefaults ? createConfigFromDefaults(defaults) : await promptGeneratorInput(defaults, logger);

        if (!basePath) {
            basePath = join(process.cwd(), config.app.id);
        }
        addChangeForResourceModel(config);
        const fs = await generate(basePath, config);

        if (!simulate) {
            await new Promise((resolve) => fs.commit(resolve));
            if (!skipInstall) {
                runNpmInstallCommand(basePath);
                logger.info('Executed npm install');
            }
        } else {
            await traceChanges(fs);
        }
    } catch (error) {
        logger.error(error.message);
    }
}

/**
 * Create a writer config based on the given defaults.
 *
 * @param defaults default values provided via command line
 * @returns writer config
 */
function createConfigFromDefaults(defaults: PromptDefaults): AdpWriterConfig {
    if (defaults.id && defaults.reference && defaults.url) {
        return {
            app: {
                id: defaults.id,
                reference: defaults.reference,
                layer: FlexLayer.CUSTOMER_BASE
            },
            target: {
                url: defaults.url,
                client: defaults.client
            },
            deploy: {
                package: defaults.package ? defaults.package.toUpperCase() : '$TMP',
                transport: defaults.transport ? defaults.transport.toUpperCase() : undefined
            },
            options: {
                fioriTools: defaults.ft,
                enableTypeScript: defaults.ts
            }
        };
    } else {
        throw new Error('Missing required parameters. Please provide --id, --reference and --url.');
    }
}

/**
 * Add a change for a new resource model to the given configuration.
 *
 * @param config configuration to be enhanced
 */
function addChangeForResourceModel(config: AdpWriterConfig): void {
    config.app.content = [
        {
            changeType: 'appdescr_ui5_addNewModelEnhanceWith',
            content: {
                modelId: 'i18n',
                bundleUrl: 'i18n/i18n.properties',
                supportedLocales: [''],
                fallbackLocale: ''
            }
        }
    ];
}

import type { Command } from 'commander';
import chalk from 'chalk';
import { getLogger, traceChanges } from '../../tracing';
import type { AdpWriterConfig, PromptDefaults } from '@sap-ux/adp-tooling';
import { promptGeneratorInput, generate } from '@sap-ux/adp-tooling';
import { runNpmInstallCommand } from '../../common';
import { join } from 'path';

/**
 * Add a new sub-command to generate SAP UI5 adaptation projects the given command.
 *
 * @param cmd main command that is to be enhanced
 */
export function addGenerateAdaptationProjectCommand(cmd: Command): void {
    cmd.command('adaptation-project [path]')
        .option('-n, --skip-install', 'skip npm install step')
        .option('-s, --simulate', 'simulate only do not write or install')
        .option('--id [id]', 'id of the adaptation project')
        .option('--reference [reference]', 'id of the original application')
        .option('--url [url]', 'url pointing to the target system containing the original app')
        .option('--ft', 'enable the Fiori tools for the generated project')
        .option('--package [package]', 'ABAP package to be used for deployments')
        .option('--transport [transport]', 'ABAP transport to be used for deployments')
        .action(async (path, options) => {
            console.log(
                `\nThe generation of adaptation projects outside of SAP Business Application Studio is currently ${chalk.bold(
                    'experimental'
                )}.`
            );
            console.log(
                'Please report any issues or feedback at https://github.com/SAP/open-ux-tools/issues/new/choose.\n'
            );
            await generateAdaptationProject(path, { ...options }, !!options.simulate, !!options.skipInstall);
        });
}

/**
 * Generate an SAP UI5 adaptation project based on the given parameters.
 *
 * @param basePath target folder of the new project
 * @param defaults optional defaults
 * @param simulate if set to true, then no files will be written to the filesystem
 * @param skipInstall if set to true then `npm i` is not executed in the new project
 */
async function generateAdaptationProject(
    basePath: string,
    defaults: PromptDefaults,
    simulate: boolean,
    skipInstall: boolean
): Promise<void> {
    const logger = getLogger();
    try {
        logger.debug(`Called generate adaptation-project for path '${basePath}', skip install is '${skipInstall}'`);
        let config: AdpWriterConfig;
        if (defaults.id && defaults.reference && defaults.url) {
            const url = new URL(defaults.url);
            config = {
                app: {
                    id: defaults.id,
                    reference: defaults.reference,
                    layer: 'CUSTOMER_BASE'
                },
                target: {
                    url: url.origin,
                    client: url.searchParams.get('sap-client') ?? undefined
                },
                deploy: {
                    package: defaults.package ? defaults.package.toUpperCase() : '$TMP',
                    transport: defaults.transport ? defaults.transport.toUpperCase() : undefined
                },
                options: {
                    fioriTools: defaults.ft
                }
            };
        } else {
            config = await promptGeneratorInput(defaults);
        }
        if (!basePath) {
            basePath = join(process.cwd(), config.app.id);
        }
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

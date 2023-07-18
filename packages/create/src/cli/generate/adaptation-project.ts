import type { Command } from 'commander';
import { getLogger, traceChanges } from '../../tracing';
import type { AdpWriterConfig } from '@sap-ux/adp-tooling';
import { promptGeneratorInput, generate } from '@sap-ux/adp-tooling';
import { runNpmInstallCommand } from '../../common';
import { join } from 'path';

/**
 *
 * @param cmd
 */
export function addGenerateAdaptationProjectCommand(cmd: Command): void {
    cmd.command('adaptation-project [path]')
        .option('-n, --skip-install', 'skip npm install step')
        .option('-s, --simulate', 'simulate only do not write or install')
        .option('--id [id]', 'id of the adaptation project')
        .option('--reference [reference]', 'id of the original application')
        .option('--url [url]', 'url pointing to the target system containing the original app')
        .action(async (path, options) => {
            await generateAdaptationProject(path, { ...options }, !!options.simulate, !!options.skipInstall);
        });
}

/**
 *
 * @param basePath
 * @param defaults
 * @param defaults.id
 * @param defaults.reference
 * @param defaults.url
 * @param simulate
 * @param skipInstall
 */
async function generateAdaptationProject(
    basePath: string,
    defaults: { id?: string; reference?: string; url?: string },
    simulate: boolean,
    skipInstall: boolean
): Promise<void> {
    const logger = getLogger();
    try {
        logger.debug(`Called generate adaptation-project for path '${basePath}', skip install is '${skipInstall}'`);
        let config: AdpWriterConfig;
        if (defaults.id && defaults.reference && defaults.url) {
            config = {
                app: {
                    id: defaults.id,
                    reference: defaults.reference,
                    layer: 'CUSTOMER_BASE'
                },
                target: {
                    url: defaults.url
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

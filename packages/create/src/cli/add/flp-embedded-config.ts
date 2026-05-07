import type { Command } from 'commander';
import { getLogger, traceChanges, setLogLevelVerbose } from '../../tracing';
import { generateFlpEmbeddedConfig } from '@sap-ux/app-config-writer';

const DEFAULT_FLP_PATH = 'sap/bc/ui5_ui5/ui2/ushell/shells/abap/Fiorilaunchpad.html';

/**
 * Add the "add flp-embedded-config" command to a passed command.
 *
 * @param cmd - commander command to attach the flp-embedded-config subcommand to
 */
export function addFlpEmbeddedConfigCommand(cmd: Command): void {
    cmd.command('flp-embedded-config [path]')
        .description(
            `Add the necessary configuration for running a Fiori app in FLP Embedded Mode.
Adds a \`start-embedded\` script to \`package.json\` and creates an \`flp.yaml\` file
based on the existing \`ui5.yaml\`.

Example:
    \`npx --yes @sap-ux/create@latest add flp-embedded-config --bspApplication my-bsp-app\``
        )
        .requiredOption('-b, --bspApplication <string>', 'BSP application name of the deployed app')
        .option(
            '-c, --config <string>',
            'Path (relative to project root) to the ui5.yaml to use as base for flp.yaml',
            'ui5.yaml'
        )
        .option('--flp <string>', 'FLP URL path used in the start-embedded script', DEFAULT_FLP_PATH)
        .option('-s, --simulate', 'Simulate only. Do not write files. Also sets `--verbose`.')
        .option('-v, --verbose', 'Show verbose information.')
        .action(async (path, options) => {
            if (options.verbose === true || options.simulate) {
                setLogLevelVerbose();
            }
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
            await runFlpEmbeddedConfig(path || process.cwd(), options);
        });
}

/**
 * Run the flp-embedded-config generation.
 *
 * @param basePath - project root (where package.json and ui5.yaml are)
 * @param options - parsed CLI options
 * @param options.bspApplication - BSP application name of the deployed app
 * @param options.config - path to the ui5.yaml to use as base for flp.yaml
 * @param options.flp - FLP URL path used in the start-embedded script
 * @param options.simulate - if true, simulate only and do not write files
 */
async function runFlpEmbeddedConfig(
    basePath: string,
    options: { bspApplication: string; config: string; flp: string; simulate?: boolean }
): Promise<void> {
    const logger = getLogger();
    try {
        logger.debug(
            `Called add flp-embedded-config for path '${basePath}', bspApplication '${options.bspApplication}'`
        );
        const fs = await generateFlpEmbeddedConfig(
            basePath,
            options.bspApplication,
            options.flp,
            options.config,
            undefined,
            logger
        );
        if (!options.simulate) {
            fs.commit(() => logger.info(`FLP Embedded Mode configuration written.`));
        } else {
            await traceChanges(fs);
        }
    } catch (error) {
        logger.error(`Error while executing add flp-embedded-config: ${(error as Error).message}`);
        logger.debug(error as Error);
    }
}

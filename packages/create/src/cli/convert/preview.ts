import type { Command } from 'commander';
import { getLogger, setLogLevelVerbose, traceChanges } from '../../tracing';
import { convertToVirtualPreview, simulatePrompt, includeTestRunnersPrompt } from '@sap-ux/app-config-writer';

/**
 * Add a new sub-command to convert the preview of a project to virtual files.
 *
 * @param {Command} cmd - The command to add the convert sub-command to.
 */
export function addConvertPreviewCommand(cmd: Command): void {
    cmd.command('preview-config [path]')
        .description('Convert an app to use virtual preview endpoints and update configuration files.')
        .option('-i, --interactive <boolean>', 'ask for config options, otherwise use defaults')
        .option('-s, --simulate <boolean>', 'simulate only do not write')
        .option('-v, --verbose', 'show verbose information')
        .option('-t, --tests <boolean>', 'also convert test suite and test runners')
        .action(async (path, options) => {
            const simulateString = /(?:=)?(true|false)/i.exec(options.simulate)?.[1];
            const testsString = /(?:=)?(true|false)/i.exec(options.tests)?.[1];
            const simulate = simulateString ? simulateString.toLowerCase() === 'true' : undefined;
            const tests = testsString ? testsString.toLowerCase() === 'true' : undefined;
            await convertPreview(path, simulate, tests, options.verbose, !!options.interactive);
        });
}

/**
 * Changes the data source of an adaptation project.
 *
 * @param {string} basePath - The path to the adaptation project.
 * @param {boolean} simulate - If set to true, then no files will be written to the filesystem.
 * @param {boolean} convertTests - If set to true, then test suite and test runners fill be included in the conversion.
 * @param {boolean} verbose - If set to true, then verbose information will be logged.
 * @param {boolean} interactive - if true, prompt user for config options, otherwise use defaults.
 */
async function convertPreview(
    basePath: string,
    simulate: boolean | undefined,
    convertTests: boolean | undefined,
    verbose = false,
    interactive: boolean
): Promise<void> {
    let logger = getLogger();

    if (!basePath) {
        basePath = process.cwd();
    }

    simulate =
        simulate ??
        (interactive
            ? await simulatePrompt().catch((error: Error) => {
                  logger.error(error.message);
                  return process.exit(1);
              })
            : false);
    if (simulate || verbose) {
        setLogLevelVerbose();
    }
    // Reinitialize logger with verbose log level
    logger = getLogger();

    convertTests =
        convertTests ??
        (interactive
            ? await includeTestRunnersPrompt().catch((error: Error) => {
                  logger.error(error.message);
                  return process.exit(1);
              })
            : false);

    logger.debug(
        `Called convert preview-config for path '${basePath}', simulate is '${simulate}', convert tests is '${convertTests}'.`
    );
    try {
        const fs = await convertToVirtualPreview(basePath, { convertTests, logger });

        if (!simulate) {
            fs.commit(() => logger.info(`The changes for preview conversion have been written.`));
        } else {
            await traceChanges(fs);
        }
    } catch (error) {
        logger.error(error?.message);
        logger.debug(error);
    }
}

import type { Command } from 'commander';
import { getLogger, setLogLevelVerbose, traceChanges } from '../../tracing';
import { convertToVirtualPreview } from '@sap-ux/app-config-writer';
/**
 * Add a new sub-command to convert the preview of a project to virtual files.
 *
 * @param {Command} cmd - The command to add the convert sub-command to.
 */
export function addConvertPreviewCommand(cmd: Command): void {
    cmd.command('preview-config [path]')
        .option('-s, --simulate', 'simulate only do not write or install')
        .option('-v, --verbose', 'show verbose information')
        .action(async (path, options) => {
            if (options.verbose === true || options.simulate) {
                setLogLevelVerbose();
            }
            await convertPreview(path, !!options.simulate);
        });
}

/**
 * Changes the data source of an adaptation project.
 *
 * @param {string} basePath - The path to the adaptation project.
 * @param {boolean} simulate - If set to true, then no files will be written to the filesystem.
 */
async function convertPreview(basePath: string, simulate: boolean): Promise<void> {
    const logger = getLogger();

    if (!basePath) {
        basePath = process.cwd();
    }

    logger.debug(`Called convert preview for path '${basePath}'. The simulate path is '${simulate}'.`);
    try {
        const fs = await convertToVirtualPreview(basePath, logger);

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

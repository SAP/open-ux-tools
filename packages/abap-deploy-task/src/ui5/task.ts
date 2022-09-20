import { ZipFile } from 'yazl';
import { createWriteStream } from 'fs';
import { resolve as resolvePath } from 'path';
import { ToolsLogger, UI5ToolingTransport } from '@sap-ux/logger';
import type { TaskParameters } from '../types';

/**
 * Create a zip file based on the given object.
 *
 * @param zip ZipFile as object
 */
function writeZipFile(zip: ZipFile): Promise<string> {
    return new Promise<string>((resolve) => {
        const archive = resolvePath(process.cwd(), 'archive.zip');
        zip.outputStream.pipe(createWriteStream(archive)).on('close', () => resolve(archive));
        zip.end({ forceZip64Format: false });
    });
}

/**
 * Custom task to upload the build result to the UI5 ABAP Repository.
 *
 * @param params
 * @param params.workspace
 * @param params.dependencies
 * @param params.taskUtil
 * @param params.options
 */
async function task({ workspace, dependencies, taskUtil, options }: TaskParameters<object>): Promise<void> {
    const logger = new ToolsLogger({
        transports: [new UI5ToolingTransport({ moduleName: 'abap-deploy-task' })]
    });

    logger.info(`Deploying ${options.projectName}`);

    const prefix = `/resources/${options.projectName}/`;
    const zip = new ZipFile();
    const resources = await workspace.byGlob(`${prefix}**/*`);
    for (const resource of resources) {
        const path = resource.getPath().replace(prefix, '');
        logger.info(path);
        const buffer = await resource.getBuffer();
        zip.addBuffer(buffer, path);
    }
    await writeZipFile(zip);
}

export = task;

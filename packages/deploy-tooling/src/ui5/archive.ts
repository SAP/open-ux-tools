import { ZipFile } from 'yazl';
import type { ToolsLogger } from '@sap-ux/logger';
import type { DuplexCollection } from '@ui5/fs';
import { createBuffer } from '../base';

/**
 * Create an archive of files in the workspace.
 *
 * @param logger - reference to the logger instance
 * @param workspace - reference to the UI5 tooling workspace object
 * @param projectName - project properties and configuration
 * @returns {*}  {Promise<Buffer>} - archive
 */
export async function createUi5Archive(
    logger: ToolsLogger,
    workspace: DuplexCollection,
    projectName: string,
    exclude: string[] = []
): Promise<Buffer> {
    logger.info('Creating archive with UI5 build result.');
    const prefix = `/resources/${projectName}/`;
    const zip = new ZipFile();
    const resources = await workspace.byGlob(`${prefix}**/*`);
    for (const resource of resources) {
        if (!exclude.some((regex) => resource.getPath().match(regex))) {
            const path = resource.getPath().replace(prefix, '');
            logger.debug(`Adding ${path}`);
            const buffer = await resource.getBuffer();
            zip.addBuffer(buffer, path);
        }
    }
    logger.info('Archive created.');
    return createBuffer(zip);
}

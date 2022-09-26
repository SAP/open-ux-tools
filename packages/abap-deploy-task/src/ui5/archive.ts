import { ZipFile } from 'yazl';
import type { ToolsLogger } from '@sap-ux/logger';
import type { TaskParameters } from '@ui5/builder';
import type { DuplexCollection } from '@ui5/fs';
import { createBuffer } from '../base';

/**
 *
 * @param logger
 * @param workspace
 * @param options
 */
export async function createUi5Archive(
    logger: ToolsLogger,
    workspace: DuplexCollection,
    options: TaskParameters<unknown>['options']
) {
    const prefix = `/resources/${options.projectName}/`;
    const zip = new ZipFile();
    const resources = await workspace.byGlob(`${prefix}**/*`);
    for (const resource of resources) {
        const path = resource.getPath().replace(prefix, '');
        logger.debug(path);
        const buffer = await resource.getBuffer();
        zip.addBuffer(buffer, path);
    }
    return createBuffer(zip);
}

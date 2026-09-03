import { join } from 'node:path';
import { readUi5Config, getVariant, resolveAdpConfiguration } from '@sap-ux/adp-tooling';
import { createWorkspace, createReader } from '@ui5/fs/resourceFactory';
import { downloadAppResources } from '@ui5/task-adaptation';
import type { DownloadAppResourcesInput, ExecuteFunctionalityOutput } from '../types/index.js';
import { DOWNLOAD_APP_RESOURCES_ID } from '../constant.js';

/**
 * Downloads the base application resources for an Adaptation Project (CF or ABAP) and writes them
 * to the `.contexts/` directory under the project root.
 *
 * @param params - Tool input carrying the adaptation project root path.
 * @returns Aligned tool output with the path written reported in `changes`.
 */
export async function downloadBaseAppResources(params: DownloadAppResourcesInput): Promise<ExecuteFunctionalityOutput> {
    const ui5Config = await readUi5Config(params.appPath, 'ui5.yaml');
    const configuration = resolveAdpConfiguration(ui5Config);

    const variant = await getVariant(params.appPath);
    const workspace = createWorkspace({
        reader: createReader({
            fsBasePath: join(params.appPath, 'webapp'),
            virBasePath: `/`,
            name: `Source reader for adaptation project ${variant.id}`
        })
    });

    const targetWritePath = `${params.appPath}/.contexts/`;
    try {
        await downloadAppResources(
            { workspace, options: { configuration } } as unknown as Parameters<typeof downloadAppResources>[0],
            targetWritePath
        );
        return {
            functionalityId: DOWNLOAD_APP_RESOURCES_ID,
            status: 'Success',
            message: `Base app resources downloaded to ${targetWritePath}`,
            parameters: params,
            appPath: params.appPath,
            changes: [targetWritePath],
            timestamp: new Date().toISOString()
        };
    } catch (e) {
        return {
            functionalityId: DOWNLOAD_APP_RESOURCES_ID,
            status: 'Error',
            message: (e as Error).message,
            parameters: params,
            appPath: params.appPath,
            changes: [],
            timestamp: new Date().toISOString()
        };
    }
}

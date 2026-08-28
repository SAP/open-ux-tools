import { join } from 'node:path';
import { readUi5Config, getVariant, extractAdpConfig, extractCfBuildTask } from '@sap-ux/adp-tooling';
import { createWorkspace, createReader } from '@ui5/fs/resourceFactory';
import { downloadAppResources } from '@ui5/task-adaptation';
import type { DownloadAppResourcesInput } from '../types/index.js';

/**
 *
 * @param params
 */
export async function downloadBaseAppResources(params: DownloadAppResourcesInput): Promise<string> {
    const ui5Config = await readUi5Config(params.appPath, 'ui5.yaml');
    const configuration = extractCfBuildTask(ui5Config);
    extractAdpConfig(ui5Config);

    // The UI5 namespace is the app-variant id with dots replaced by slashes. It must be used for
    // both the reader's virBasePath and the projectNamespace passed to previewManifest, because
    // task-adaptation strips `/resources/<namespace>/` off the resource paths returned by byGlob.
    const variant = await getVariant(params.appPath);
    const workspace = createWorkspace({
        reader: createReader({
            fsBasePath: join(params.appPath, 'webapp'),
            virBasePath: `/`,
            name: `Source reader for adaptation project ${variant.id}`
        })
    });

    // previewManifest only reads workspace.byGlob; its published type additionally demands
    // `taskUtil`, which the preview path never uses, hence the cast (matches task-adaptation's
    // own tests, which pass the same shape).
    await downloadAppResources(
        { workspace, options: { configuration } } as unknown as Parameters<typeof downloadAppResources>[0],
        `${params.appPath}/.contexts/`
    );
    return JSON.stringify({ filesWritten: true });
}

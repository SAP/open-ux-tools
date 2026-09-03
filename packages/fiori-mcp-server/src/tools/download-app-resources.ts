import { join } from 'node:path';
import { readUi5Config, getVariant, extractCfBuildTask } from '@sap-ux/adp-tooling';
import { createWorkspace, createReader } from '@ui5/fs/resourceFactory';
import { downloadAppResources } from '@ui5/task-adaptation';
import type { DownloadAppResourcesInput } from '../types/index.js';

/**
 * Downloads the app resources for a Cloud Foundry Adaptation Project and writes them
 * to the `.contexts/` directory under the project root.
 *
 * Delegates to `downloadAppResources` from `@ui5/task-adaptation`. Cloud Foundry only:
 * `extractCfBuildTask` throws `No CF ADP project found` for non-CF (e.g. ABAP) projects.
 *
 * @param params - Tool input carrying the adaptation project root path.
 * @returns A JSON string with `filesWritten: true` and the `path` where files were written.
 */
export async function downloadBaseAppResources(params: DownloadAppResourcesInput): Promise<string> {
    const ui5Config = await readUi5Config(params.appPath, 'ui5.yaml');
    const configuration = extractCfBuildTask(ui5Config);

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
    const targetWritePath = `${params.appPath}/.contexts/`;
    await downloadAppResources(
        { workspace, options: { configuration } } as unknown as Parameters<typeof downloadAppResources>[0],
        targetWritePath
    );
    return JSON.stringify({ filesWritten: true, path: targetWritePath });
}

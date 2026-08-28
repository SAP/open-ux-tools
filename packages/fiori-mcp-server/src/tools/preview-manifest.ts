import { join } from 'node:path';
import { previewManifest } from '@ui5/task-adaptation';
import { extractCfBuildTask, getVariant, readUi5Config } from '@sap-ux/adp-tooling';
import type { PreviewManifestInput } from '../types/index.js';

import { createReader, createWorkspace } from '@ui5/fs/resourceFactory';

/**
 * Produces the manifest.json that a full app-variant build would produce, without going to the
 * HTML5 Repository. Delegates to `previewManifest` from `@ui5/task-adaptation`, which expects a
 * real `@ui5/fs` workspace over the adaptation project's `webapp` source. A full build must have
 * run at least once so the base app files are cached; otherwise `previewManifest` throws.
 *
 * Cloud Foundry only: `previewManifest` supports CF landscapes, and `extractCfBuildTask` throws
 * `No CF ADP project found` for non-CF (e.g. ABAP) projects.
 *
 * @param params - Tool input carrying the adaptation project root path.
 * @returns The merged manifest.json serialized as a formatted JSON string.
 */
export async function validateManifest(params: PreviewManifestInput): Promise<string> {
    const ui5Config = await readUi5Config(params.appPath, 'ui5.yaml');
    const configuration = extractCfBuildTask(ui5Config);

    // The UI5 namespace is the app-variant id with dots replaced by slashes. It must be used for
    // both the reader's virBasePath and the projectNamespace passed to previewManifest, because
    // task-adaptation strips `/resources/<namespace>/` off the resource paths returned by byGlob.
    const variant = await getVariant(params.appPath);
    const projectNamespace = variant.id.replaceAll('.', '/');

    const workspace = createWorkspace({
        reader: createReader({
            fsBasePath: join(params.appPath, 'webapp'),
            virBasePath: '/',
            name: `Source reader for adaptation project ${variant.id}`
        })
    });

    // previewManifest only reads workspace.byGlob; its published type additionally demands
    // `taskUtil`, which the preview path never uses, hence the cast (matches task-adaptation's
    // own tests, which pass the same shape).
    const manifest: unknown = await previewManifest({
        workspace,
        options: { configuration, projectNamespace }
    } as unknown as Parameters<typeof previewManifest>[0]);

    return JSON.stringify(manifest, null, 2);
}

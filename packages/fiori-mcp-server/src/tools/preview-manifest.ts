import { join } from 'node:path';
import { previewManifest } from '@ui5/task-adaptation';
import { resolveAdpConfiguration, getVariant, readUi5Config } from '@sap-ux/adp-tooling';
import type { PreviewManifestInput, ExecuteFunctionalityOutput } from '../types/index.js';
import { PREVIEW_MANIFEST_ID } from '../constant.js';

import { createReader, createWorkspace } from '@ui5/fs/resourceFactory';

/**
 * Produces the manifest.json that a full app-variant build would produce, without going to the
 * HTML5 Repository or ABAP Repository. Delegates to `previewManifest` from `@ui5/task-adaptation`.
 * A full build must have run at least once so the base app files are cached, otherwise `previewManifest`
 * throws an error with the respective error message.
 *
 * @param params - Tool input carrying the adaptation project root path.
 * @returns Aligned tool output with the merged manifest.json as a formatted JSON string in `message`.
 */
export async function validateManifest(params: PreviewManifestInput): Promise<ExecuteFunctionalityOutput> {
    const ui5Config = await readUi5Config(params.appPath, 'ui5.yaml');
    const configuration = resolveAdpConfiguration(ui5Config);

    const variant = await getVariant(params.appPath);
    const projectNamespace = variant.id.replaceAll('.', '/');

    const workspace = createWorkspace({
        reader: createReader({
            fsBasePath: join(params.appPath, 'webapp'),
            virBasePath: '/',
            name: `Source reader for adaptation project ${variant.id}`
        })
    });

    try {
        const manifest: unknown = await previewManifest({
            workspace,
            options: { configuration, projectNamespace }
        } as unknown as Parameters<typeof previewManifest>[0]);

        return {
            functionalityId: PREVIEW_MANIFEST_ID,
            status: 'Success',
            message: JSON.stringify(manifest, null, 2),
            parameters: params,
            appPath: params.appPath,
            changes: [],
            timestamp: new Date().toISOString()
        };
    } catch (e) {
        return {
            functionalityId: PREVIEW_MANIFEST_ID,
            status: 'Error',
            message: (e as Error).message,
            parameters: params,
            appPath: params.appPath,
            changes: [],
            timestamp: new Date().toISOString()
        };
    }
}

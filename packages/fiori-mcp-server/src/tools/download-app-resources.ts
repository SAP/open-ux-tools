import { join } from 'node:path';
import { readUi5Config, getVariant, extractCfBuildTask, extractAdpConfig } from '@sap-ux/adp-tooling';
import type { UI5YamlCustomTaskConfiguration } from '@sap-ux/adp-tooling';
import { createWorkspace, createReader } from '@ui5/fs/resourceFactory';
import { downloadAppResources } from '@ui5/task-adaptation';
import type { DownloadAppResourcesInput } from '../types/index.js';

/**
 * Downloads the base app resources for an Adaptation Project (CF or ABAP) and writes them
 * to the `.contexts/` directory under the project root.
 *
 * For CF projects, configuration is extracted from the `app-variant-bundler-build` custom task.
 * For ABAP projects, configuration is derived from the `adp` preview middleware config.
 *
 * @param params - Tool input carrying the adaptation project root path.
 * @returns A JSON string with `filesWritten: true` and the `path` where files were written.
 */
export async function downloadBaseAppResources(params: DownloadAppResourcesInput): Promise<string> {
    const ui5Config = await readUi5Config(params.appPath, 'ui5.yaml');

    let configuration: UI5YamlCustomTaskConfiguration;
    try {
        configuration = extractCfBuildTask(ui5Config);
    } catch {
        const adpConfig = extractAdpConfig(ui5Config);
        if (!adpConfig || !('target' in adpConfig)) {
            throw new Error('No CF or ABAP ADP project found');
        }
        configuration = { target: adpConfig.target, type: 'abap' } as unknown as UI5YamlCustomTaskConfiguration;
    }

    const variant = await getVariant(params.appPath);
    const workspace = createWorkspace({
        reader: createReader({
            fsBasePath: join(params.appPath, 'webapp'),
            virBasePath: `/`,
            name: `Source reader for adaptation project ${variant.id}`
        })
    });

    const targetWritePath = `${params.appPath}/.contexts/`;
    await downloadAppResources(
        { workspace, options: { configuration } } as unknown as Parameters<typeof downloadAppResources>[0],
        targetWritePath
    );
    return JSON.stringify({ filesWritten: true, path: targetWritePath });
}

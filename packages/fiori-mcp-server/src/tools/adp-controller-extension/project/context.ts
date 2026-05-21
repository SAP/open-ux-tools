import { basename } from 'node:path';
import { getVariant } from '@sap-ux/adp-tooling';
import type { ExecuteFunctionalityOutput } from '../../../types';
import { logger } from '../../../utils/logger';
import { buildOutput } from '../output';
import type { ProjectContext } from '../types';

/**
 * Reads the descriptor variant and assembles a {@link ProjectContext}. Errors
 * (including a missing `manifest.appdescr_variant`) are logged and surfaced
 * as a tool error envelope so the caller can return it as-is.
 *
 * @param appPath Adaptation project root directory.
 * @returns The context on success or an error envelope on failure.
 */
export async function loadProjectContext(
    appPath: string
): Promise<{ context: ProjectContext } | { error: ExecuteFunctionalityOutput }> {
    try {
        const variant = await getVariant(appPath);
        const layer = String(variant.layer ?? '');
        const variantId = variant.id ?? '';
        const projectFolderName = basename(appPath);
        logger.debug(`Manifest variant - layer: ${layer}, id: ${variantId}`);
        logger.debug(`Project folder name: ${projectFolderName}`);
        return { context: { layer, variantId, projectFolderName } };
    } catch (error) {
        const message = `Failed to read manifest.appdescr_variant: ${
            error instanceof Error ? error.message : String(error)
        }`;
        logger.error(message);
        return { error: buildOutput('error', message, appPath) };
    }
}

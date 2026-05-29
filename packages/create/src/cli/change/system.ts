import { isAppStudio } from '@sap-ux/btp-utils';
import type { BackendSystem } from '@sap-ux/store';
import { getService, BackendSystemKey } from '@sap-ux/store';
import { replaceEnvVariables } from '@sap-ux/ui5-config';
import { getLogger } from '../../tracing';

/**
 * Updates a backend system in the saved systems store.
 *
 * @param params - update parameters
 * @param params.url - URL identifying the system
 * @param params.client - optional SAP client identifying the system
 * @param params.name - optional new display name
 * @param params.username - optional new username
 * @param params.password - optional new password
 * @param params.clearCredentials - if true, clears stored credentials
 */
export async function updateSystem(params: {
    url: string;
    client?: string;
    name?: string;
    username?: string;
    password?: string;
    clearCredentials: boolean;
}): Promise<void> {
    const logger = getLogger();
    try {
        if (isAppStudio()) {
            logger.error(
                'System management using the CLI is not supported in SAP Business Application Studio. Use the built-in system management instead.'
            );
            return;
        }

        const patchRecord: Record<string, unknown> = {};

        replaceEnvVariables(params);

        if (params.name !== undefined) {
            patchRecord.name = params.name;
        }

        if (params.clearCredentials) {
            patchRecord.username = undefined;
            patchRecord.password = undefined;
        } else if (params.username !== undefined || params.password !== undefined) {
            if (params.username !== undefined) {
                patchRecord.username = params.username;
            }
            if (params.password !== undefined) {
                patchRecord.password = params.password;
            }
        }

        const patch = patchRecord as Partial<BackendSystem>;

        if (!Object.keys(patchRecord).length) {
            logger.error(
                'No fields to update. Provide at least one of: --name, --username, --password, --clear-credentials'
            );
            return;
        }

        const service = await getService<BackendSystem, BackendSystemKey>({ entityName: 'system' });
        const key = new BackendSystemKey({ url: params.url, client: params.client });
        const existing = await service.read(key);
        if (!existing) {
            logger.error(`System not found: ${key.getId()}`);
            return;
        }
        await service.partialUpdate(key, patch);
        logger.info(`System '${key.getId()}' updated.`);
    } catch (error) {
        logger.error((error as Error).message);
        // Log the full error object (including stack trace) at debug level so it
        // is visible when --verbose / debug logging is enabled.
        logger.debug(error);
    }
}

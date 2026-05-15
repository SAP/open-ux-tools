import type { Command } from 'commander';
import { isAppStudio } from '@sap-ux/btp-utils';
import type { BackendSystem } from '@sap-ux/store';
import { getService, BackendSystemKey } from '@sap-ux/store';
import { replaceEnvVariables } from '@sap-ux/ui5-config';
import { getLogger } from '../../tracing';

/**
 * Add the "system update" subcommand to a passed command.
 * Updates an existing backend system in the saved systems store (~/.fioritools).
 * The system is identified by URL and optional SAP client.
 *
 * @param cmd - commander command to attach the update subcommand to
 */
export function addSystemUpdateCommand(cmd: Command): void {
    cmd.command('update')
        .description(
            `Update an existing backend system in the saved systems store (~/.fioritools).
The system is identified by its URL and optional SAP client.

Example:
    \`npx --yes @sap-ux/create@latest system update --url https://my-sap.example.com --name "New Name"\`
    \`npx --yes @sap-ux/create@latest system update --url https://my-sap.example.com --client 100 --username newuser\``
        )
        .requiredOption('--url <string>', 'URL of the backend system to update')
        .option('--client <string>', 'SAP client number to identify the system (optional)')
        .option('--name <string>', 'New display name for the system')
        .option('--username <string>', 'New username')
        .option('--password <string>', 'New password')
        .option('--clear-credentials', 'Remove stored credentials from the system')
        .action(async (options) => {
            await updateSystem({
                url: options.url,
                client: options.client,
                name: options.name,
                username: options.username,
                password: options.password,
                clearCredentials: !!options.clearCredentials
            });
        });
}

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
async function updateSystem(params: {
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
                'System management via CLI is not supported in SAP Business Application Studio. Use the built-in system management instead.'
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
        logger.info(`System '${key.getId()}' updated successfully.`);
    } catch (error) {
        logger.error((error as Error).message);
        logger.debug(error);
    }
}

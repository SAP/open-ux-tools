import type { Command } from 'commander';
import { isAppStudio } from '@sap-ux/btp-utils';
import type { BackendSystem } from '@sap-ux/store';
import { getService, BackendSystemKey } from '@sap-ux/store';
import { getLogger } from '../../tracing';

/**
 * Add the "remove system" subcommand to a passed command.
 * Removes a saved backend system from the store (~/.fioritools) and deletes its credentials from the OS keychain.
 *
 * @param cmd - commander command to attach the system subcommand to
 */
export function addSystemRemoveCommand(cmd: Command): void {
    cmd.command('system')
        .description(
            `Remove a saved back-end system from the saved system store (\`~/.fioritools\`). Also deletes any stored credentials in the OS keychain.\n
Example:
    \`npx --yes @sap-ux/create@latest remove system --url https://my-sap.example.com\`
    \`npx --yes @sap-ux/create@latest remove system --url https://my-sap.example.com --client 100\``
        )
        .requiredOption('--url <string>', 'URL of the backend system to remove')
        .option('--client <string>', 'SAP client number (optional)')
        .action(async (options) => {
            await removeSystem(options.url, options.client);
        });
}

/**
 * Removes a backend system from the saved systems store.
 *
 * @param url - URL of the system to remove
 * @param client - optional SAP client
 */
async function removeSystem(url: string, client: string | undefined): Promise<void> {
    const logger = getLogger();
    try {
        if (isAppStudio()) {
            logger.error(
                'System management using the CLI is not supported in SAP Business Application Studio. Use the built-in system management instead.'
            );
            return;
        }

        const service = await getService<BackendSystem, BackendSystemKey>({ entityName: 'system' });
        const key = new BackendSystemKey({ url, client });
        const system = await service.read(key);

        if (!system) {
            logger.error(`System not found: ${key.getId()}`);
            return;
        }

        const deleted = await service.delete(system);
        if (deleted) {
            logger.info(`System '${system.name}' removed.`);
        } else {
            logger.error(`Failed to remove system: ${key.getId()}`);
        }
    } catch (error) {
        logger.error((error as Error).message);
        logger.debug(error);
    }
}

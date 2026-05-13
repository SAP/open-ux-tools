import type { Command } from 'commander';
import { prompt } from 'prompts';
import { isAppStudio } from '@sap-ux/btp-utils';
import type { BackendSystemKey } from '@sap-ux/store';
import { getService, BackendSystem, SystemType, AuthenticationType, ConnectionType } from '@sap-ux/store';
import { getLogger } from '../../tracing';

/**
 * Add the "add system" command to a passed command.
 * Adds a new backend system to the saved systems store (~/.fioritools).
 * Credentials are stored securely in the OS keychain.
 *
 * @param cmd - commander command to attach the system sub-command to
 */
export function addSystemCommand(cmd: Command): void {
    cmd.command('system')
        .description(
            `Add a new backend system to the saved systems store (~/.fioritools).
Credentials are stored securely in the OS keychain.

System types: ${Object.values(SystemType).join(' | ')}
Auth types:   ${Object.values(AuthenticationType).join(' | ')}
Connection types: ${Object.values(ConnectionType).join(' | ')}

Example:
    \`npx --yes @sap-ux/create@latest add system --name "My System" --url https://my-sap.example.com\`
    \`npx --yes @sap-ux/create@latest add system --name "My System" --url https://my-sap.example.com --client 100 --username myuser\``
        )
        .requiredOption('--name <string>', 'Display name for the system')
        .requiredOption('--url <string>', 'URL of the backend system')
        .option('--client <string>', 'SAP client number (optional)')
        .option('--type <string>', `System type (${Object.values(SystemType).join(' | ')})`, SystemType.AbapOnPrem)
        .option(
            '--auth <string>',
            `Authentication type (${Object.values(AuthenticationType).join(' | ')})`,
            AuthenticationType.Basic
        )
        .option(
            '--connection-type <string>',
            `Connection type (${Object.values(ConnectionType).join(' | ')})`,
            ConnectionType.AbapCatalog
        )
        .option(
            '--username <string>',
            'Username for basic authentication (password will be prompted or read from SAP_UX_SYSTEM_PASSWORD env var)'
        )
        .action(async (options) => {
            await addSystem({
                name: options.name,
                url: options.url,
                client: options.client,
                systemType: options.type,
                authenticationType: options.auth,
                connectionType: options.connectionType,
                username: options.username
            });
        });
}

/**
 * Adds a backend system to the saved systems store.
 *
 * @param params - system parameters
 * @param params.name - display name for the system
 * @param params.url - URL of the backend system
 * @param params.client - optional SAP client
 * @param params.systemType - system type
 * @param params.authenticationType - authentication type
 * @param params.connectionType - connection type
 * @param params.username - optional username for basic auth
 */
async function addSystem(params: {
    name: string;
    url: string;
    client?: string;
    systemType: string;
    authenticationType: string;
    connectionType: string;
    username?: string;
}): Promise<void> {
    const logger = getLogger();
    try {
        if (isAppStudio()) {
            logger.error(
                'System management via CLI is not supported in SAP Business Application Studio. Use the built-in system management instead.'
            );
            return;
        }

        // Resolve password securely — never from a CLI flag to avoid shell history exposure
        let password: string | undefined;
        if (params.username) {
            password = process.env.SAP_UX_SYSTEM_PASSWORD;
            if (!password) {
                const result = await prompt({
                    type: 'password',
                    name: 'password',
                    message: `Password for user '${params.username}':`
                });
                password = result.password || undefined;
            }
        }

        const service = await getService<BackendSystem, BackendSystemKey>({ entityName: 'system' });

        const system = new BackendSystem({
            name: params.name,
            url: params.url,
            client: params.client,
            systemType: params.systemType as (typeof SystemType)[keyof typeof SystemType],
            authenticationType:
                params.authenticationType as (typeof AuthenticationType)[keyof typeof AuthenticationType],
            connectionType: params.connectionType as (typeof ConnectionType)[keyof typeof ConnectionType],
            username: params.username,
            password
        });

        await service.write(system);
        logger.info(`System '${params.name}' (${params.url}) added successfully.`);
    } catch (error) {
        logger.error((error as Error).message);
        logger.debug(error);
    }
}

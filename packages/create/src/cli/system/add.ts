import type { Command } from 'commander';
import { isAppStudio } from '@sap-ux/btp-utils';
import type { BackendSystemKey } from '@sap-ux/store';
import { getService, BackendSystem, SystemType, AuthenticationType, ConnectionType } from '@sap-ux/store';
import { replaceEnvVariables } from '@sap-ux/ui5-config';
import { getLogger } from '../../tracing';

/**
 * Add the "system add" subcommand to a passed command.
 * Adds a new backend system to the saved systems store (~/.fioritools).
 * Credentials are stored securely in the OS keychain.
 *
 * @param cmd - commander command to attach the add subcommand to
 */
export function addSystemAddCommand(cmd: Command): void {
    cmd.command('add')
        .description(
            `Add a new backend system to the saved systems store (~/.fioritools).
Credentials are stored securely in the OS keychain.

System types: ${Object.values(SystemType).join(' | ')}
Auth types:   ${Object.values(AuthenticationType).join(' | ')}
Connection types: ${Object.values(ConnectionType).join(' | ')}

Example:
    \`npx --yes @sap-ux/create@latest system add --name "My System" --url https://my-sap.example.com\`
    \`npx --yes @sap-ux/create@latest system add --name "My System" --url https://my-sap.example.com --client 100 --username myuser\``
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
        .option('--username <string>', 'Username for basic authentication')
        .option('--password <string>', 'Password for basic authentication')
        .action(async (options) => {
            await addSystem({
                name: options.name,
                url: options.url,
                client: options.client,
                systemType: options.type,
                authenticationType: options.auth,
                connectionType: options.connectionType,
                username: options.username,
                password: options.password
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
 * @param params.password - optional password for basic auth
 */
async function addSystem(params: {
    name: string;
    url: string;
    client?: string;
    systemType: string;
    authenticationType: string;
    connectionType: string;
    username?: string;
    password?: string;
}): Promise<void> {
    const logger = getLogger();
    try {
        if (isAppStudio()) {
            logger.error(
                'System management via CLI is not supported in SAP Business Application Studio. Use the built-in system management instead.'
            );
            return;
        }

        const validSystemTypes = Object.values(SystemType) as string[];
        if (!validSystemTypes.includes(params.systemType)) {
            logger.error(`Invalid system type '${params.systemType}'. Valid values: ${validSystemTypes.join(', ')}`);
            return;
        }
        const validAuthTypes = Object.values(AuthenticationType) as string[];
        if (!validAuthTypes.includes(params.authenticationType)) {
            logger.error(
                `Invalid auth type '${params.authenticationType}'. Valid values: ${validAuthTypes.join(', ')}`
            );
            return;
        }
        const validConnectionTypes = Object.values(ConnectionType) as string[];
        if (!validConnectionTypes.includes(params.connectionType)) {
            logger.error(
                `Invalid connection type '${params.connectionType}'. Valid values: ${validConnectionTypes.join(', ')}`
            );
            return;
        }

        const service = await getService<BackendSystem, BackendSystemKey>({ entityName: 'system' });

        replaceEnvVariables(params);

        const system = new BackendSystem({
            name: params.name,
            url: params.url,
            client: params.client,
            systemType: params.systemType as (typeof SystemType)[keyof typeof SystemType],
            authenticationType:
                params.authenticationType as (typeof AuthenticationType)[keyof typeof AuthenticationType],
            connectionType: params.connectionType as (typeof ConnectionType)[keyof typeof ConnectionType],
            username: params.username,
            password: params.password
        });

        await service.write(system);
        logger.info(`System '${params.name}' (${params.url}) added successfully.`);
    } catch (error) {
        logger.error((error as Error).message);
        logger.debug(error);
    }
}

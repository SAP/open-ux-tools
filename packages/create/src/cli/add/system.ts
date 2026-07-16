import type { Command } from 'commander';
import { isAppStudio } from '@sap-ux/btp-utils';
import {
    getService,
    BackendSystem,
    BackendSystemKey,
    SystemType,
    AuthenticationType,
    ConnectionType
} from '@sap-ux/store';
import { replaceEnvVariables } from '@sap-ux/ui5-config';
import { config as loadEnvConfig } from 'dotenv';
import { validateClient } from '@sap-ux/project-input-validator';
import { getLogger } from '../../tracing/index.js';
import { promptForSystemConfig } from '../utils/system-prompts.js';
import { checkConnectionOrPrompt } from '../utils/system-connection.js';

/**
 * Add the "add system" subcommand to a passed command.
 * Adds a new backend system to the saved systems store (~/.fioritools).
 * Credentials are stored securely in the OS keychain.
 *
 * @param cmd - commander command to attach the system subcommand to
 */
export function addSystemAddCommand(cmd: Command): void {
    cmd.command('system')
        .description(
            `Add a new back-end system to the saved systems store (\`~/.fioritools\`). Credentials are stored securely in the OS keychain.\n
            System types: \`${Object.values(SystemType).join('`, `')}\`
            Auth types: \`${Object.values(AuthenticationType).join('`, `')}\`
            Connection types: \`${Object.values(ConnectionType).join('`, `')}\`\n
Example:
    \`npx --yes @sap-ux/create@latest add system --name "My System" --url https://my-sap.example.com\`
    \`npx --yes @sap-ux/create@latest add system --name "My System" --url https://my-sap.example.com --client 100 --username myuser\`
    \`npx --yes @sap-ux/create@latest add system\` (interactive mode)`
        )
        .option('--name <string>', 'Display name for the system')
        .option('--url <string>', 'URL of the backend system')
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
        .option(
            '--password <string>',
            "To avoid plain-text credentials in the shell's history, pass an env reference: --password env:MY_VAR"
        )
        .option('--skip-check', 'Skip connection verification before saving')
        .action(async (options) => {
            loadEnvConfig();
            await addSystem({
                name: options.name,
                url: options.url,
                client: options.client,
                systemType: options.type,
                authenticationType: options.auth,
                connectionType: options.connectionType,
                username: options.username,
                password: options.password,
                skipCheck: !!options.skipCheck
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
 * @param params.skipCheck - skip connection verification
 */
async function addSystem(params: {
    name?: string;
    url?: string;
    client?: string;
    systemType?: string;
    authenticationType?: string;
    connectionType?: string;
    username?: string;
    password?: string;
    skipCheck?: boolean;
}): Promise<void> {
    const logger = getLogger();
    try {
        if (isAppStudio()) {
            logger.error(
                'System management using the CLI is not supported in SAP Business Application Studio. Use the built-in system management instead.'
            );
            return;
        }

        // Prompt for missing fields interactively
        const config = await promptForSystemConfig({
            name: params.name,
            url: params.url,
            client: params.client,
            systemType: params.systemType,
            authenticationType: params.authenticationType,
            connectionType: params.connectionType,
            username: params.username,
            password: params.password
        });

        // Validate required fields
        if (!config.name || !config.url || !config.systemType || !config.authenticationType || !config.connectionType) {
            logger.error('Missing required fields. System was not added.');
            return;
        }

        // Validate name is not empty or whitespace-only
        if (config.name.trim().length === 0) {
            logger.error('System name cannot be empty or whitespace-only.');
            return;
        }

        // Replace env variables early so validation and duplicate check work with resolved values
        replaceEnvVariables(config);

        try {
            new URL(config.url);
        } catch {
            logger.error(`Invalid URL: '${config.url}'`);
            return;
        }

        // Validate client format if provided (must be empty or 3 digits)
        if (config.client !== undefined && config.client !== '') {
            const clientValidation = validateClient(config.client);
            if (clientValidation !== true) {
                logger.error(
                    `Invalid client '${config.client}'. Leave this field empty or enter a value between 000-999.`
                );
                return;
            }
        }

        const validSystemTypes = Object.values(SystemType) as string[];
        if (!validSystemTypes.includes(config.systemType)) {
            logger.error(`Invalid system type '${config.systemType}'. Valid values: ${validSystemTypes.join(', ')}`);
            return;
        }
        const validAuthTypes = Object.values(AuthenticationType) as string[];
        if (!validAuthTypes.includes(config.authenticationType)) {
            logger.error(
                `Invalid auth type '${config.authenticationType}'. Valid values: ${validAuthTypes.join(', ')}`
            );
            return;
        }
        const validConnectionTypes = Object.values(ConnectionType) as string[];
        if (!validConnectionTypes.includes(config.connectionType)) {
            logger.error(
                `Invalid connection type '${config.connectionType}'. Valid values: ${validConnectionTypes.join(', ')}`
            );
            return;
        }

        const service = await getService<BackendSystem, BackendSystemKey>({ entityName: 'system' });

        // Check for duplicate URL+client
        const existingSystem = await service.read(new BackendSystemKey({ url: config.url, client: config.client }));
        if (existingSystem) {
            const clientSuffix = config.client ? ` (client ${config.client})` : '';
            logger.error(`System '${config.url}'${clientSuffix} already exists. Use 'update system' to update it.`);
            return;
        }

        // Check for duplicate name
        const allSystems = await service.getAll();
        const nameExists = allSystems.some((system) => system.name.toLowerCase() === config.name.toLowerCase());
        if (nameExists) {
            logger.error(`A system with the name '${config.name}' already exists. Please choose a different name.`);
            return;
        }

        // Check connection before saving (unless --skip-check)
        const shouldSave = await checkConnectionOrPrompt(
            {
                url: config.url,
                client: config.client,
                systemType: config.systemType,
                authenticationType: config.authenticationType,
                username: config.username,
                password: config.password
            },
            params.skipCheck || false
        );

        if (!shouldSave) {
            logger.info('System was not saved.');
            return;
        }

        const system = new BackendSystem({
            name: config.name,
            url: config.url,
            client: config.client,
            systemType: config.systemType as (typeof SystemType)[keyof typeof SystemType],
            authenticationType:
                config.authenticationType as (typeof AuthenticationType)[keyof typeof AuthenticationType],
            connectionType: config.connectionType as (typeof ConnectionType)[keyof typeof ConnectionType],
            username: config.username,
            password: config.password
        });

        await service.write(system);
        logger.info(`System '${config.name}' added.`);
    } catch (error) {
        logger.error((error as Error).message);
        logger.debug(error);
    }
}

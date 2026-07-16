import type { Command } from 'commander';
import { isAppStudio } from '@sap-ux/btp-utils';
import type { BackendSystem } from '@sap-ux/store';
import { getService, BackendSystemKey } from '@sap-ux/store';
import { replaceEnvVariables } from '@sap-ux/ui5-config';
import { config as loadEnvConfig } from 'dotenv';
import { isSystemNameTaken, type SystemNameValidationOptions } from '@sap-ux/inquirer-common';
import { getLogger } from '../../tracing/index.js';
import { promptForSystemIdentifier, promptForUpdateFields, promptForFieldUpdates } from '../utils/system-prompts.js';
import { checkConnectionOrPrompt } from '../utils/system-connection.js';

/**
 * Add the "update system" subcommand to a passed command.
 * Updates an existing backend system in the saved systems store (~/.fioritools).
 * The system is identified by URL and optional SAP client.
 *
 * @param cmd - commander command to attach the system subcommand to
 */
export function addSystemUpdateCommand(cmd: Command): void {
    cmd.command('system')
        .description(
            `Update an existing backend system in the saved systems store (\`~/.fioritools\`). The system is identified by its URL and optional SAP client.\n

Example:
    \`npx --yes @sap-ux/create@latest update system --url https://my-sap.example.com --name "New Name"\`
    \`npx --yes @sap-ux/create@latest update system --url https://my-sap.example.com --client 100 --username newuser\`
    \`npx --yes @sap-ux/create@latest update system\` (interactive mode)`
        )
        .option('--url <string>', 'URL of the backend system to update')
        .option('--client <string>', 'SAP client number to identify the system (optional)')
        .option('--name <string>', 'New display name for the system')
        .option('--username <string>', 'New username')
        .option(
            '--password <string>',
            "To avoid plain-text credentials in the shell's history, pass an env reference: --password env:MY_VAR"
        )
        .option('--clear-credentials', 'Remove stored credentials from the system')
        .option('--skip-check', 'Skip connection verification before saving')
        .action(async (options) => {
            loadEnvConfig();
            await updateSystem({
                url: options.url,
                client: options.client,
                name: options.name,
                username: options.username,
                password: options.password,
                clearCredentials: !!options.clearCredentials,
                skipCheck: !!options.skipCheck
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
 * @param params.skipCheck - skip connection verification
 */
async function updateSystem(params: {
    url?: string;
    client?: string;
    name?: string;
    username?: string;
    password?: string;
    clearCredentials: boolean;
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

        // Prompt for system identifier if not provided
        const identifier = await promptForSystemIdentifier({
            url: params.url,
            client: params.client
        });

        const service = await getService<BackendSystem, BackendSystemKey>({ entityName: 'system' });
        const key = new BackendSystemKey({ url: identifier.url, client: identifier.client });
        const existing = await service.read(key);
        if (!existing) {
            logger.error(`System not found: ${key.getId()}`);
            return;
        }

        // Determine which fields to update
        const hasExplicitUpdates =
            params.name !== undefined ||
            params.username !== undefined ||
            params.password !== undefined ||
            params.clearCredentials;

        let patchRecord: Record<string, unknown>;

        if (hasExplicitUpdates) {
            // Use provided flags
            patchRecord = {};
            if (params.name !== undefined) {
                // Validate name is not empty or whitespace-only
                if (params.name.trim().length === 0) {
                    logger.error('System name cannot be empty or whitespace-only.');
                    return;
                }
                // Validate name uniqueness when updating via flag
                const nameExists = await isSystemNameTaken(params.name, { excludeSystem: existing });
                if (nameExists) {
                    logger.error(
                        `A system with the name '${params.name}' already exists. Please choose a different name.`
                    );
                    return;
                }
                patchRecord.name = params.name;
            }
            if (params.clearCredentials) {
                patchRecord.username = '';
                patchRecord.password = '';
            } else if (params.username !== undefined || params.password !== undefined) {
                if (params.username !== undefined) {
                    patchRecord.username = params.username;
                }
                if (params.password !== undefined) {
                    patchRecord.password = params.password;
                }
            }
        } else {
            // No flags provided - prompt interactively
            const fieldsToUpdate = await promptForUpdateFields(existing);
            patchRecord = await promptForFieldUpdates(fieldsToUpdate, existing);
        }

        replaceEnvVariables(patchRecord);

        const patch = patchRecord as Partial<BackendSystem>;

        if (!Object.keys(patchRecord).length) {
            logger.error(
                'No fields to update. Provide at least one of: --name, --username, --password, --clear-credentials'
            );
            return;
        }

        // Check connection if credentials are being updated (unless --skip-check)
        const updatingCredentials = patch.username !== undefined || patch.password !== undefined;
        if (updatingCredentials && !params.clearCredentials) {
            const shouldSave = await checkConnectionOrPrompt(
                {
                    url: existing.url,
                    client: existing.client,
                    systemType: existing.systemType,
                    authenticationType: existing.authenticationType || 'basic',
                    username: (patch.username as string) ?? existing.username,
                    password: (patch.password as string) ?? existing.password
                },
                params.skipCheck || false
            );

            if (!shouldSave) {
                logger.info('System was not updated.');
                return;
            }
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

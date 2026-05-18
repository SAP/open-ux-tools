import type { Command } from 'commander';
import { isAppStudio } from '@sap-ux/btp-utils';
import type { BackendSystem } from '@sap-ux/store';
import { getService, BackendSystemKey } from '@sap-ux/store';
import { getLogger } from '../../tracing';

/**
 * Add the "get system" subcommand to a passed command.
 * Retrieves details of a saved backend system identified by its URL and optional client.
 * Sensitive data (passwords, tokens) is never included in the output.
 *
 * @param cmd - commander command to attach the system subcommand to
 */
export function addSystemGetCommand(cmd: Command): void {
    cmd.command('system')
        .description(
            `Retrieve details of a saved back-end system by URL.
Sensitive data (passwords, tokens) is never included in the output.

Example:
    \`npx --yes @sap-ux/create@latest get system --url https://my-sap.example.com\`
    \`npx --yes @sap-ux/create@latest get system --url https://my-sap.example.com --client 100\`
    \`npx --yes @sap-ux/create@latest get system --url https://my-sap.example.com --json\``
        )
        .requiredOption('--url <string>', 'URL of the backend system.')
        .option('--client <string>', 'SAP client number (optional).')
        .option('--json', 'Output as JSON, which is useful for automation and MCP integrations.')
        .action(async (options) => {
            await getSystem(options.url, options.client, !!options.json);
        });
}

/**
 * Retrieves a backend system from the store by its URL and optional client.
 *
 * @param url - URL of the backend system
 * @param client - optional SAP client
 * @param asJson - if true, output as JSON; otherwise print human-readable
 */
async function getSystem(url: string, client: string | undefined, asJson: boolean): Promise<void> {
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

        const publicView = {
            name: system.name,
            url: system.url,
            client: system.client,
            systemType: system.systemType,
            authenticationType: system.authenticationType,
            connectionType: system.connectionType,
            userDisplayName: system.userDisplayName,
            hasSensitiveData: system.hasSensitiveData
        };

        if (asJson) {
            console.log(JSON.stringify(publicView, null, 2));
        } else {
            logger.info(`Name:       ${system.name}`);
            logger.info(`URL:        ${system.url}`);
            if (system.client) {
                logger.info(`Client:     ${system.client}`);
            }
            logger.info(`Type:       ${system.systemType}`);
            logger.info(`Auth:       ${system.authenticationType ?? 'n/a'}`);
            logger.info(`Connection: ${system.connectionType}`);
            if (system.hasSensitiveData) {
                logger.info(`Credentials stored securely.`);
            }
        }
    } catch (error) {
        logger.error((error as Error).message);
        logger.debug(error);
    }
}

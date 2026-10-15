import type { Command } from 'commander';
import { BackendSystemKey } from '@sap-ux/store';
import { getLogger } from '../../tracing/index.js';
import { findSystemByUrl } from '../utils/system-lookup.js';
import { rejectIfAppStudio, getSystemService, toPublicView } from '../utils/system-store.js';

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
            `Retrieve details of a saved back-end system by URL. Sensitive data (passwords, tokens) is never included in the output.\n
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
        if (rejectIfAppStudio(logger)) {
            return;
        }

        const service = await getSystemService(asJson);

        // Use smart lookup to handle client mismatch scenarios
        const system = await findSystemByUrl(url, client, service);

        if (!system) {
            const key = new BackendSystemKey({ url, client });
            logger.error(`System not found: ${key.getId()}`);
            return;
        }

        const publicView = toPublicView(system);

        if (asJson) {
            // Use process.stdout.write so the output is pure JSON with no logger
            // prefixes or timestamps — required for machine consumption and piping.
            process.stdout.write(JSON.stringify(publicView, null, 2) + '\n');
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
            } else {
                logger.info(`No credentials stored.`);
            }
        }
    } catch (error) {
        logger.error((error as Error).message);
        // Log the full error object (including stack trace) at debug level so it
        // is visible when --verbose / debug logging is enabled.
        logger.debug(error);
    }
}

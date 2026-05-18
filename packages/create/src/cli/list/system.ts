import type { Command } from 'commander';
import { isAppStudio } from '@sap-ux/btp-utils';
import type { BackendSystem, BackendSystemKey } from '@sap-ux/store';
import { getService } from '@sap-ux/store';
import { getLogger } from '../../tracing';

/**
 * Add the "list system" subcommand to a passed command.
 * Lists all backend systems saved in the store (~/.fioritools).
 * Sensitive data (passwords, tokens) is never included in the output.
 *
 * @param cmd - commander command to attach the system subcommand to
 */
export function addSystemListCommand(cmd: Command): void {
    cmd.command('system')
        .description(
            `List all back-end systems in the saved system store: ~/.fioritools.
Sensitive data (passwords, tokens) is never included in the output.

Example:
    \`npx --yes @sap-ux/create@latest list system\`
    \`npx --yes @sap-ux/create@latest list system --json\``
        )
        .option('--json', 'Output as JSON, which is useful for automation and MCP integrations.')
        .action(async (options) => {
            await listSystems(!!options.json);
        });
}

/**
 * Lists all backend systems from the store.
 * Sensitive fields are not shown.
 *
 * @param asJson - if true, output as JSON; otherwise print a human-readable list
 */
async function listSystems(asJson: boolean): Promise<void> {
    const logger = getLogger();
    try {
        if (isAppStudio()) {
            logger.error(
                'System management using the CLI is not supported in SAP Business Application Studio. Use the built-in system management instead.'
            );
            return;
        }

        const service = await getService<BackendSystem, BackendSystemKey>({ entityName: 'system' });
        // Pass no filter so all systems are returned regardless of connection type
        const systems = await service.getAll();

        if (asJson) {
            console.log(JSON.stringify(systems.map(toPublicView), null, 2));
        } else if (systems.length === 0) {
            logger.info('No systems found.');
        } else {
            logger.info(`Systems (${systems.length}):`);
            for (const system of systems) {
                printSystem(system, logger);
            }
        }
    } catch (error) {
        logger.error((error as Error).message);
        logger.debug(error);
    }
}

/**
 * Returns a view of a system with only non-sensitive fields.
 *
 * @param system - the backend system
 * @returns non-sensitive system data
 */
function toPublicView(system: BackendSystem): Record<string, unknown> {
    return {
        name: system.name,
        url: system.url,
        client: system.client,
        systemType: system.systemType,
        authenticationType: system.authenticationType,
        connectionType: system.connectionType,
        userDisplayName: system.userDisplayName,
        hasSensitiveData: system.hasSensitiveData
    };
}

/**
 * Prints a single system to the logger in human-readable format.
 *
 * @param system - the backend system to print
 * @param logger - logger instance
 */
function printSystem(system: BackendSystem, logger: ReturnType<typeof getLogger>): void {
    const lines = [
        `  Name:       ${system.name}`,
        `  URL:        ${system.url}`,
        system.client ? `  Client:     ${system.client}` : undefined,
        `  Type:       ${system.systemType}`,
        `  Auth:       ${system.authenticationType ?? 'n/a'}`,
        `  Connection: ${system.connectionType}`,
        system.hasSensitiveData ? `  Credentials stored securely.` : undefined,
        `  ---`
    ];
    for (const line of lines) {
        if (line !== undefined) {
            logger.info(line);
        }
    }
}

import type { Command } from 'commander';
import { config as loadEnvConfig } from 'dotenv';
import { updateSystem } from '../change/system';

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
    \`npx --yes @sap-ux/create@latest update system --url https://my-sap.example.com --client 100 --username newuser\``
        )
        .requiredOption('--url <string>', 'URL of the backend system to update')
        .option('--client <string>', 'SAP client number to identify the system (optional)')
        .option('--name <string>', 'New display name for the system')
        .option('--username <string>', 'New username')
        .option(
            '--password <string>',
            "To avoid plain-text credentials in the shell's history, pass an env reference: --password env:MY_VAR"
        )
        .option('--clear-credentials', 'Remove stored credentials from the system')
        .action(async (options) => {
            loadEnvConfig();
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

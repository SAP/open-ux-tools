import { Command } from 'commander';
import { addSystemListCommand } from './list';
import { addSystemGetCommand } from './get';

/**
 * Return 'sap-ux system *' commands for querying saved backend systems.
 * Read-only operations (list, get) are grouped here.
 * Write operations are exposed via their respective top-level commands:
 *   add system, change system, remove system.
 *
 * Available subcommands: list, get
 *
 * @returns - commander command containing system query subcommands
 */
export function getSystemCommands(): Command {
    const systemCommands = new Command('system');
    addSystemListCommand(systemCommands);
    addSystemGetCommand(systemCommands);
    return systemCommands;
}

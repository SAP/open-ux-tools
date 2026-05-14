import { Command } from 'commander';
import { addSystemAddCommand } from './add';
import { addSystemListCommand } from './list';
import { addSystemGetCommand } from './get';
import { addSystemUpdateCommand } from './update';
import { addSystemRemoveCommand } from './remove';

/**
 * Return 'sap-ux system *' commands for managing saved backend systems.
 * All system management commands are grouped here to keep them separate
 * from application-feature commands (add, remove, etc.).
 *
 * Available subcommands: add, list, get, update, remove
 *
 * @returns - commander command containing system management subcommands
 */
export function getSystemCommands(): Command {
    const systemCommands = new Command('system');
    addSystemAddCommand(systemCommands);
    addSystemListCommand(systemCommands);
    addSystemGetCommand(systemCommands);
    addSystemUpdateCommand(systemCommands);
    addSystemRemoveCommand(systemCommands);
    return systemCommands;
}

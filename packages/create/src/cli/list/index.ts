import { Command } from 'commander';
import { addListSystemCommand } from './system';

/**
 * Return 'sap-ux list *' commands.
 *
 * @returns - commander command containing list <feature> commands
 */
export function getListCommands(): Command {
    const listCommands = new Command('list');
    addListSystemCommand(listCommands);
    return listCommands;
}

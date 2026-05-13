import { Command } from 'commander';
import { addUpdateSystemCommand } from './system';

/**
 * Return 'sap-ux update *' commands.
 *
 * @returns - commander command containing update <feature> commands
 */
export function getUpdateCommands(): Command {
    const updateCommands = new Command('update');
    addUpdateSystemCommand(updateCommands);
    return updateCommands;
}

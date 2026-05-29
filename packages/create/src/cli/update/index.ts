import { Command } from 'commander';
import { addSystemUpdateCommand } from './system';

/**
 * Return 'create-fiori update *' commands. Commands include also the handler action.
 *
 * @returns - commander command containing update <feature> commands
 */
export function getUpdateCommands(): Command {
    const updateCommands = new Command('update');
    addSystemUpdateCommand(updateCommands);
    return updateCommands;
}

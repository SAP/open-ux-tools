import { Command } from 'commander';
import { addRemoveMockserverConfigCommand } from './mockserver-config';
import { addSystemRemoveCommand } from './system';

/**
 * Return 'create-fiori remove *' commands. Commands include also the handler action.
 *
 * @returns - commander command containing remove <feature> commands
 */
export function getRemoveCommands(): Command {
    const removeCommands = new Command('remove');
    addRemoveMockserverConfigCommand(removeCommands);
    addSystemRemoveCommand(removeCommands);
    return removeCommands;
}

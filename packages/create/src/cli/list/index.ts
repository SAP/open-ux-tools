import { Command } from 'commander';
import { addSystemListCommand } from '../system/list';

/**
 * Return 'create-fiori list *' commands. Commands include also the handler action.
 *
 * @returns - commander command containing list <feature> commands
 */
export function getListCommands(): Command {
    const listCommands = new Command('list');
    addSystemListCommand(listCommands);
    return listCommands;
}

import { Command } from 'commander';
import { addSystemGetCommand } from './system';

/**
 * Return 'create-fiori get *' commands. Commands include also the handler action.
 *
 * @returns - commander command containing get <feature> commands
 */
export function getGetCommands(): Command {
    const getCommands = new Command('get');
    addSystemGetCommand(getCommands);
    return getCommands;
}

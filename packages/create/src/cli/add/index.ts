import { Command } from 'commander';
import { addAddMockserverConfigCommand } from './mockserver-config';

/**
 * Return 'create-fiori add *' commands. Commands include also the handler action.
 *
 * @returns - commander command containing add <feature> commands
 */
export function getAddCommands(): Command {
    const addCommands = new Command('add');
    // create-fiori add mockserver-config
    addAddMockserverConfigCommand(addCommands);
    return addCommands;
}

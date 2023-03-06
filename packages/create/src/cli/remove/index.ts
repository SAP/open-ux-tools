import { Command } from 'commander';
import { addRemoveMockserverConfigCommand } from './mockserver-config';
import { addRemoveSmartLinksConfigCommand } from './smartlinks-config';

/**
 * Return 'create-fiori remove *' commands. Commands include also the handler action.
 *
 * @returns - commander command containing remove <feature> commands
 */
export function getRemoveCommands(): Command {
    const removeCommands = new Command('remove');
    // create-fiori remove mockserver-config
    addRemoveMockserverConfigCommand(removeCommands);
    addRemoveSmartLinksConfigCommand(removeCommands);
    return removeCommands;
}

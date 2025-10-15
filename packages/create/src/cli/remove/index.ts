import { Command } from 'commander';
import { addRemoveMockserverConfigCommand } from './mockserver-config';

/**
 * Return 'create-fiori remove *' commands. Commands include also the handler action.
 *
 * @returns - commander command containing remove <feature> commands
 */
export function getRemoveCommands(): Command {
    const removeCommands = new Command('remove');

    addRemoveMockserverConfigCommand(removeCommands);

    const subCommandNames = removeCommands.commands.map((cmd) => cmd.name());
    const featureSummary = subCommandNames.slice(0, 3).join(', ');
    removeCommands.description(
        `Remove features from existing SAP Fiori applications (e.g., ${featureSummary}, ...). Run 'remove --help' for a full list.`
    );
    return removeCommands;
}

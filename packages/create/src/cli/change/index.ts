import { Command } from 'commander';
import { addChangeDataSourceCommand } from './change-data-source';
import { addChangeInboundCommand } from './change-inbound';

/**
 * Return 'create-fiori change *' commands. Commands include also the handler action.
 *
 * @returns - commander command containing change <feature> commands
 */
export function getChangeCommands(): Command {
    const changeCommands = new Command('change');

    addChangeDataSourceCommand(changeCommands);
    addChangeInboundCommand(changeCommands);

    const subCommandNames = changeCommands.commands.map((cmd) => cmd.name());
    const featureSummary = subCommandNames.slice(0, 3).join(', ');
    changeCommands.description(
        `Change existing adaptation projects (e.g., ${featureSummary}, ...). Run 'change --help' for a full list.`
    );
    return changeCommands;
}

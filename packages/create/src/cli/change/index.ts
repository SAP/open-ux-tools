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
    return changeCommands;
}

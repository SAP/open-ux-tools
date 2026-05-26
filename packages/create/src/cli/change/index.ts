import { Command } from 'commander';
import { addChangeDataSourceCommand } from './change-data-source.js';
import { addChangeInboundCommand } from './change-inbound.js';
import { addSystemUpdateCommand } from './system.js';

/**
 * Return 'create-fiori change *' commands. Commands include also the handler action.
 *
 * @returns - commander command containing change <feature> commands
 */
export function getChangeCommands(): Command {
    const changeCommands = new Command('change');
    addChangeDataSourceCommand(changeCommands);
    addChangeInboundCommand(changeCommands);
    addSystemUpdateCommand(changeCommands);
    return changeCommands;
}

import { Command } from 'commander';
import { addChangeDataSourceCommand } from './change-data-source';
import { addChangeInboundCommand } from './change-inbound';

/**
 * Return 'create-fiori change *' commands. Commands include also the handler action.
 *
 * @returns - commander command containing change <feature> commands
 */
export function getChangeCommands(): Command {
    const addCommands = new Command('change')
        .description('List of commands to change existing adaptation projects.');

    addChangeDataSourceCommand(addCommands);
    addChangeInboundCommand(addCommands);
    return addCommands;
}

import { Command } from 'commander';
import { addChangeDataSourceCommand } from './change-data-source';

/**
 * Return 'create-fiori change *' commands. Commands include also the handler action.
 *
 * @returns - commander command containing change <feature> commands
 */
export function getChangeCommands(): Command {
    const addCommands = new Command('change');
    // create-fiori change data-source
    addChangeDataSourceCommand(addCommands);
    return addCommands;
}

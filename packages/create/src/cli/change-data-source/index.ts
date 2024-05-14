import { Command } from 'commander';
import { addChangeDataSourceCommand } from './change-data-source';

/**
 * @returns 'adp *' commands. Commands include also the handler action.
 */
export function getAdpCommands(): Command {
    const adpCommands = new Command('adp');
    addChangeDataSourceCommand(adpCommands);
    return adpCommands;
}

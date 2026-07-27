import { Command } from 'commander';
import { addSystemUpdateCommand } from './system.js';
import { addMetadataUpdateCommand } from './metadata.js';

/**
 * Return 'create-fiori update *' commands. Commands include also the handler action.
 *
 * @returns - commander command containing update <feature> commands
 */
export function getUpdateCommands(): Command {
    const updateCommands = new Command('update');
    addSystemUpdateCommand(updateCommands);
    addMetadataUpdateCommand(updateCommands);
    return updateCommands;
}

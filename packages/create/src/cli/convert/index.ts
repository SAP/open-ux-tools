import { Command } from 'commander';
import { addConvertPreviewCommand } from './preview';

/**
 * Return 'create-fiori convert *' commands. Commands include also the handler action.
 *
 * @returns - commander command containing convert <feature> commands
 */
export function getConvertCommands(): Command {
    const convertCommands = new Command('convert');
    addConvertPreviewCommand(convertCommands);
    return convertCommands;
}

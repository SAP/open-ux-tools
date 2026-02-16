import { Command } from 'commander';
import { addConvertPreviewCommand } from './preview';
import { addConvertEslintCommand } from './eslint-config';

/**
 * Return 'create-fiori convert *' commands. Commands include also the handler action.
 *
 * @returns - commander command containing convert <feature> commands
 */
export function getConvertCommands(): Command {
    const convertCommands = new Command('convert');
    addConvertPreviewCommand(convertCommands);
    addConvertEslintCommand(convertCommands);
    return convertCommands;
}

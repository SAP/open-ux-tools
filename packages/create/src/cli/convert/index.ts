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

    const subCommandNames = convertCommands.commands.map((cmd) => cmd.name());
    const featureSummary = subCommandNames.slice(0, 3).join(', ');
    convertCommands.description(
        `Convert existing SAP Fiori applications (e.g., ${featureSummary}, ...). Run 'convert --help' for a full list.`
    );
    return convertCommands;
}

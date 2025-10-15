import { Command } from 'commander';
import { addGenerateAdaptationProjectCommand } from './adaptation-project';

/**
 * @returns 'generate *' commands. Commands include also the handler action.
 */
export function getGenerateCommands(): Command {
    const genCommands = new Command('generate');

    addGenerateAdaptationProjectCommand(genCommands);

    const subCommandNames = genCommands.commands.map((cmd) => cmd.name());
    const featureSummary = subCommandNames.slice(0, 3).join(', ');
    genCommands.description(
        `Generate adaptation projects (e.g., ${featureSummary}, ...). Run 'generate --help' for a full list.`
    );
    return genCommands;
}

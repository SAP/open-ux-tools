import { Command } from 'commander';
import { addGenerateAdaptationProjectCommand } from './adaptation-project';

/**
 * @returns 'generate *' commands. Commands include also the handler action.
 */
export function getGenerateCommands(): Command {
    const genCommands = new Command('generate')
        .description('List of commands to generate adaptation projects.');

    addGenerateAdaptationProjectCommand(genCommands);
    return genCommands;
}

import { Command } from 'commander';
import { addGenerateAdaptationProjectCommand } from './adaptation-project';

/**
 * @returns 'generate *' commands. Commands include also the handler action.
 */
export function getGenerateCommands(): Command {
    const genCommands = new Command('generate');
    // create-fiori generate adaptation-project
    addGenerateAdaptationProjectCommand(genCommands);
    return genCommands;
}

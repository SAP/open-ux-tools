import { Command } from 'commander';
import { addGenerateAdaptationProjectCommand } from './adaptation-project';

/**
 * @returns 'generate *' commands. Commands include also the handler action.
 */
export function getGenerateCommands(): Command {
    const genCommands = new Command('generate');
    addGenerateAdaptationProjectCommand(genCommands);
    return genCommands;
}

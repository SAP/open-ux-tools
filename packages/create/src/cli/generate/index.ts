import { Command } from 'commander';
import { addGenerateAdaptationProjectCommand } from './adaptation-project';
import { addGenerateFioriApp } from './fiori-app';

/**
 * @returns 'generate *' commands. Commands include also the handler action.
 */
export function getGenerateCommands(): Command {
    const genCommands = new Command('generate');
    // fiori generate adaptation-project
    addGenerateAdaptationProjectCommand(genCommands);
    // fiori generate fiori-app
    addGenerateFioriApp(genCommands);
    return genCommands;
}

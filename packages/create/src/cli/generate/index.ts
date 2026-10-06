import { Command } from 'commander';
import { addGenerateAdaptationProjectCommand } from './adaptation-project.js';
import { addGenerateOpa5TestsCommand } from './opa5-tests.js';

/**
 * @returns 'generate *' commands. Commands include also the handler action.
 */
export function getGenerateCommands(): Command {
    const genCommands = new Command('generate');
    addGenerateAdaptationProjectCommand(genCommands);
    addGenerateOpa5TestsCommand(genCommands);
    return genCommands;
}

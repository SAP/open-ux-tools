import { Command } from 'commander';
import { addGenerateAdaptationProjectCommand } from './adaptation-project.js';
import { addGenerateOpaTestsCommand } from './opa-tests.js';

/**
 * @returns 'generate *' commands. Commands include also the handler action.
 */
export function getGenerateCommands(): Command {
    const genCommands = new Command('generate');
    addGenerateAdaptationProjectCommand(genCommands);
    addGenerateOpaTestsCommand(genCommands);
    return genCommands;
}

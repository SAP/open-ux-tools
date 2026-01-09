import { Command } from 'commander';
import { addSetupAdaptationProjectCFCommand } from './adaptation-project-cf';

/**
 * Returns a command group for setup operations.
 *
 * @returns - commander command group
 */
export function getSetupCommands(): Command {
    const setupCommands = new Command('setup');
    addSetupAdaptationProjectCFCommand(setupCommands);
    return setupCommands;
}

export { addSetupAdaptationProjectCFCommand } from './adaptation-project-cf';

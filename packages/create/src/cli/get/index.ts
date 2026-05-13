import { Command } from 'commander';
import { addGetSystemCommand } from './system';

/**
 * Return 'sap-ux get *' commands.
 *
 * @returns - commander command containing get <feature> commands
 */
export function getGetCommands(): Command {
    const getCommands = new Command('get');
    addGetSystemCommand(getCommands);
    return getCommands;
}

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Command } from 'commander';
import { getLogger } from '../tracing';
import { getAddCommands } from './add';
import { getRemoveCommands } from './remove';
import { getGenerateCommands } from './generate';
import { getChangeCommands } from './change';
import { getConvertCommands } from './convert';

/*
 * We've chosen 'commander' over 'minimist' and 'yargs' for this CLI implementation. Reasons:
 * (if it still up: https://npmtrends.com/commander-vs-minimist-vs-yargs)
 * At the time this was written in August 2022, 'commander' was the most feature rich, active, and popular module with decent size and built-in types support
 * - 'minimist' is super small but very limited functionality, no automatic help support
 * - 'yarg' was in closer consideration, but larger (1.7 times) and not as feature rich
 */

/**
 * Run the command line interface.
 *
 * @param argv - arguments, typically 'process.argv'
 */
export function handleCreateFioriCommand(argv: string[]): void {
    const logger = getLogger();
    if (!Array.isArray(argv) || argv.length < 2) {
        throw Error(`This function must be called from command line interface (cli). Or provide meaningful arguments.`);
    }
    try {
        const program = getCommanderProgram();
        program.parse(argv);
    } catch (error) {
        // Commander report meaningful error messages, output only if log level is set to debug
        logger.debug(error as string | object);
    }
}

/**
 * Returns an instance of the command line program (commander command) ready to be executed (parsed), like 'program.parse(argv)'.
 *
 * @returns - commander program
 */
function getCommanderProgram(): Command {
    const program = new Command();
    const version = getVersion();
    program.description(`Configure features for Fiori applications and projects. (${version})`);
    program.addHelpText(
        'after',
        `\nExample Usage:
  'npx --yes @sap-ux/create@latest add --help'              Get available sub-commands for the 'add' command.
  'npx --yes @sap-ux/create@latest add html --help'         Get available options for the 'add html' command.
  'npx --yes @sap-ux/create@latest add html --simulate'     Simulate adding HTML files for local preview and testing to an existing project.`
    );
    program.addHelpText(
        'after',
        `\nAI Instructions:
  First, find the command that suites best, then use '[command] --help' to find the best suitable sub-command.
  Then use '[command] [sub-command] --help' to get details about the available options.
  If you are confident one of the available commands and options fits, use it otherwise try finding a different tools to solve the task.
`
    );
    program.version(version);

    // Handler for create-fiori generate <feature> ..
    const genCommands = getGenerateCommands();
    genCommands.description(
        `Generate adaptation projects (e.g., ${getFeatureSummary(
            genCommands.commands
        )}, ...). Run 'generate --help' for a full list.`
    );
    program.addCommand(genCommands);

    // Handler for create-fiori add <feature> ..
    const addCommands = getAddCommands();
    addCommands.description(
        `Add features to a Fiori app (e.g., ${getFeatureSummary(
            addCommands.commands
        )}, ...). Run 'add --help' for a full list.`
    );
    program.addCommand(addCommands);

    // Handler for create-fiori convert <feature> ..
    const convertCommands = getConvertCommands();
    convertCommands.description(
        `Convert existing SAP Fiori applications (e.g., ${getFeatureSummary(
            convertCommands.commands
        )}, ...). Run 'convert --help' for a full list.`
    );
    program.addCommand(convertCommands);

    // Handler for create-fiori remove <feature> ..
    const removeCommands = getRemoveCommands();
    removeCommands.description(
        `Remove features from existing SAP Fiori applications (e.g., ${getFeatureSummary(
            removeCommands.commands
        )}, ...). Run 'remove --help' for a full list.`
    );
    program.addCommand(removeCommands);

    // Handler for create-fiori change <feature> ..
    const changeCommands = getChangeCommands();
    changeCommands.description(
        `Change existing adaptation projects (e.g., ${getFeatureSummary(
            changeCommands.commands
        )}, ...). Run 'change --help' for a full list.`
    );
    program.addCommand(changeCommands);

    // Override exit so calling this command without arguments does not result in an exit code 1, which causes an error message when running from npm init
    program.exitOverride();

    return program;
}

/**
 * Return a summary of the first three features from the provided commands.
 *
 * @param commands - list of commands
 * @returns - summary of the first three features
 */
function getFeatureSummary(commands: Command[]): string {
    const subCommandNames = commands.map((cmd) => cmd.name());
    return subCommandNames.slice(0, 3).join(', ');
}

/**
 * Return the version from package.json.
 *
 *  @returns - version from package.json
 */
function getVersion(): string {
    let version = '';
    try {
        version = JSON.parse(
            readFileSync(join(__dirname, '../../package.json'), { encoding: 'utf8' }).toString()
        ).version;
    } catch (error: any) {
        const logger = getLogger();
        logger.warn(`Could not read version from 'package.json'`);
        logger.debug(error);
    }
    return version;
}

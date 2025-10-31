import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Command, type Option } from 'commander';
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
    const logger = getLogger();
    const program = new Command();
    const version = getVersion();
    program.description(`Configure features for Fiori applications and projects. (${version})`);
    program.addHelpText(
        'after',
        `\nExample Usage:
  'npx --yes @sap-ux/create@latest add --help'              Get available subcommands for the 'add' command.
  'npx --yes @sap-ux/create@latest add html --help'         Get available options for the 'add html' command.
  'npx --yes @sap-ux/create@latest add html --simulate'     Execute the 'add html' command using the 'simulate' option.\n`
    );
    program.option('--generateJsonSpec', 'Output the command structure as JSON');
    program.action((options) => {
        if (options.generateJsonSpec) {
            logger.info(generateJsonSpec(program));
        } else if (options.V || options.version) {
            logger.info(version);
        } else {
            program.outputHelp();
        }
    });
    program.version(version);

    // Handler for create-fiori generate <feature> ..
    const genCommands = getGenerateCommands();
    genCommands.description(
        `Generate adaptation projects.
                    Available Subcommands: ${getFeatureSummary(genCommands.commands)}\n`
    );
    program.addCommand(genCommands);

    // Handler for create-fiori add <feature> ..
    const addCommands = getAddCommands();
    addCommands.description(
        `Add features to an SAP Fiori app.
                    Available Subcommands: ${getFeatureSummary(addCommands.commands)}\n`
    );
    program.addCommand(addCommands);

    // Handler for create-fiori convert <feature> ..
    const convertCommands = getConvertCommands();
    convertCommands.description(
        `Convert existing SAP Fiori applications.
                    Available Subcommands: ${getFeatureSummary(convertCommands.commands)}\n`
    );
    program.addCommand(convertCommands);

    // Handler for create-fiori remove <feature> ..
    const removeCommands = getRemoveCommands();
    removeCommands.description(
        `Remove features from existing SAP Fiori applications.
                    Available Subcommands: ${getFeatureSummary(removeCommands.commands)}\n`
    );
    program.addCommand(removeCommands);

    // Handler for create-fiori change <feature> ..
    const changeCommands = getChangeCommands();
    changeCommands.description(
        `Change existing adaptation projects.
                    Available Subcommands: ${getFeatureSummary(changeCommands.commands)}`
    );
    program.addCommand(changeCommands);

    return program;
}

/**
 * Return a summary of the subcommands from the provided commands.
 *
 * @param commands - List of commands
 * @returns - Summary of the subcommands
 */
function getFeatureSummary(commands: Command[]): string {
    const subCommandNames = commands.map((cmd) => cmd.name());
    return subCommandNames.join(', ');
}

/**
 * Parses a commander.Option object into a simpler format for the JSON spec.
 *
 * @param {Option} opt - The Commander Option object.
 * @returns {object} A simplified option object.
 */
function parseOption(opt: Option) {
    return {
        name: opt.flags,
        description: opt.description,
        required: opt.required,
        ...(opt.defaultValue !== undefined && { defaultValue: opt.defaultValue })
    };
}

/**
 * Recursively parses a commander.Command object and its subcommands.
 *
 * @param cmd - The Commander Command object to parse.
 * @returns A structured object representing the command.
 */
function parseCommand(cmd: Command): {} {
    const options = 'options' in cmd ? (cmd.options as Option[]) : [];
    return {
        name: cmd.name(),
        description: cmd.description(),
        ...(options?.length > 0 && { options: options.map(parseOption) }),
        ...(cmd.commands?.length > 0 && { subcommands: cmd.commands.map(parseCommand) })
    };
}

/**
 * Generates the full MCP specification for a top-level commander program.
 *
 * @param cmd - The main Commander program instance.
 * @returns A JSON string representing the CLI's capabilities.
 */
export function generateJsonSpec(cmd: Command) {
    const spec = {
        description: cmd.description(),
        commands: cmd.commands.map(parseCommand)
    };
    return JSON.stringify(spec, null, 2);
}

/**
 * Return the version from the package.json file.
 *
 *  @returns - version from package.json
 */
function getVersion(): string {
    let version = '';
    try {
        version = JSON.parse(
            readFileSync(join(__dirname, '../../package.json'), { encoding: 'utf8' }).toString()
        ).version;
    } catch (error) {
        const logger = getLogger();
        logger.warn(`Could not read version from 'package.json'`);
        logger.debug(error);
    }
    return version;
}

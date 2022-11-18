import { readFileSync } from 'fs';
import { join } from 'path';
import { Command } from 'commander';
import { getLogger } from '../tracing';
import { getAddCommands } from './add';
import { getRemoveCommands } from './remove';

/*
 * If chosen 'commander' over 'minimist' and 'yargs' for this CLI implementation. Reasons:
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
        throw Error(`This function must be called from command line interface (cli). Or provide meaningful argv.`);
    }
    try {
        const program = getCommanderProgram();
        program.parse(argv);
    } catch (error) {
        logger.error(`Error while executing ${argv[0]} ${argv[1]}`);
        if (error instanceof Error) {
            logger.error(error);
        }
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
    program.version(version);

    // Handler for create-fiori add <feature> ..
    program.addCommand(getAddCommands());

    // Handler for create-fiori remove <feature> ..
    program.addCommand(getRemoveCommands());

    return program;
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

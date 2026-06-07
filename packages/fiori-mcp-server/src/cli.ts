import { PACKAGE_VERSION } from './package-info.js';

interface CliOutput {
    stdout: (message: string) => void;
    stderr: (message: string) => void;
}

const HELP_TEXT = `Usage: fiori-mcp [options]

SAP Fiori - Model Context Protocol (MCP) server

Options:
  -h, --help       display help for command
  -v, --version    display version number
  --log-level=<level>  set log level`;

/**
 * Checks whether an option is handled by server startup instead of metadata flag handling.
 *
 * @param arg - CLI argument.
 * @returns True when the option should be left for server startup.
 */
function isPassthroughOption(arg: string): boolean {
    return arg.startsWith('--log-level=');
}

/**
 * Handles top-level CLI metadata flags before starting the MCP server.
 *
 * @param argv - CLI arguments without node and script path.
 * @param output - Output writers used for stdout and stderr.
 * @returns True when the caller should skip server startup.
 */
export function handleCliInfoFlags(
    argv = process.argv.slice(2),
    output: CliOutput = {
        stdout: (message: string): void => {
            process.stdout.write(`${message}\n`);
        },
        stderr: (message: string): void => {
            process.stderr.write(`${message}\n`);
        }
    }
): boolean {
    if (argv.includes('--help') || argv.includes('-h')) {
        output.stdout(HELP_TEXT);
        return true;
    }

    if (argv.includes('--version') || argv.includes('-v')) {
        output.stdout(PACKAGE_VERSION);
        return true;
    }

    const unknownOption = argv.find((arg) => arg.startsWith('-') && !isPassthroughOption(arg));
    if (unknownOption) {
        output.stderr(`Unknown option: ${unknownOption}`);
        process.exitCode = 1;
        return true;
    }

    return false;
}

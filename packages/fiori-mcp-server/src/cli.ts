import { parseArgs } from 'node:util';

export type CliResult =
    | {
          action: 'start';
      }
    | {
          action: 'exit';
          exitCode: number;
          stderr?: string;
          stdout?: string;
      };

const helpText = `Usage: fiori-mcp [options]

Options:
  -v, --version  Print the package version
  -h, --help     Display help for command
`;

/**
 * Parses top-level metadata flags before starting the MCP server.
 *
 * @param args - Command-line arguments without the node executable and script path.
 * @param version - Package version to print for version flags.
 * @returns The CLI action to execute.
 */
export function parseCliArgs(args: string[], version: string): CliResult {
    try {
        const {
            values: { help: showHelp, version: showVersion }
        } = parseArgs({
            args,
            options: {
                help: {
                    type: 'boolean',
                    short: 'h'
                },
                version: {
                    type: 'boolean',
                    short: 'v'
                }
            }
        });

        if (showHelp) {
            return {
                action: 'exit',
                exitCode: 0,
                stdout: helpText
            };
        }

        if (showVersion) {
            return {
                action: 'exit',
                exitCode: 0,
                stdout: `${version}\n`
            };
        }

        return {
            action: 'start'
        };
    } catch (error: unknown) {
        const message = typeof error === 'object' && error && 'message' in error ? error.message : undefined;
        if (typeof message === 'string' && message.startsWith('Unknown option')) {
            return {
                action: 'exit',
                exitCode: 1,
                stderr: `${message}\n`
            };
        }

        throw error;
    }
}

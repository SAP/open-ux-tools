import { writeFile } from 'fs';
import { t } from '../i18n';
import minimist from 'minimist';
import prompts from 'prompts';
import type { CheckEnvironmentOptions, EnvironmentCheckResult, Endpoint } from '../types';
import { OutputMode, Severity } from '../types';
import { convertResultsToMarkdown } from '../output/markdown';
import { checkEnvironment } from '../checks/environment';
import { storeResultsZip } from '../output';

/**
 * Output usage information to console.
 */
function showHelp(): void {
    console.log(`
Usage: envcheck [<OPTIONS>] [<WORKSPACE_ROOT_A>] [<WORKSPACE_ROOT_..>]

Following <OPTIONS> are available:
    --destination <DESTINATION>         destination or stored SAP system to perform deep check, multiple destinations can be passed
    --output ${Object.values(OutputMode).join(
        ' | '
    )}  format for output, if not specified all messages except 'info' are shown

<WORKSPACE_ROOT*>                       path the root folder of a workspace. Multiple roots can be defined.
                                        We search for apps with destinations in workspaces

`);
}

/**
 * Convert command line arguments into environment check options.
 *
 * @param cliArgs - parsed command line arguments from minimist
 * @returns - options to check enviroment
 */
function getOptions(cliArgs: minimist.ParsedArgs): CheckEnvironmentOptions | undefined {
    const options: CheckEnvironmentOptions = {};
    if (cliArgs._.length > 0) {
        options.workspaceRoots = cliArgs._;
    }

    if (cliArgs['destination']) {
        options.endpoints = Array.isArray(cliArgs['destination']) ? cliArgs['destination'] : [cliArgs['destination']];
    }
    return Object.keys(options).length > 0 ? options : undefined;
}

/**
 * Writes to file.
 *
 * @param filename name of file
 * @param content file content
 */
async function writeToFile(filename: string, content: string): Promise<void> {
    return new Promise((resolve, reject) => {
        writeFile(filename, content, (error) => {
            if (error) {
                reject(error);
            }
            resolve();
        });
    });
}

/**
 * Output the results according to the selected output method.
 *
 * @param result - the data structure containing the results
 * @param mode output (JSON, markdown, zip)
 */
async function outputResults(result: EnvironmentCheckResult, mode?: OutputMode): Promise<void> {
    for (const message of result.messages || []) {
        switch (message.severity) {
            case Severity.Error: {
                console.error(`🔴 ${message.text}`);
                break;
            }
            case Severity.Warning: {
                console.warn(`🟡 ${message.text}`);
                break;
            }
            case Severity.Debug: {
                if (mode === OutputMode.Verbose) {
                    console.info(`ℹ ${message.text}`);
                }
                break;
            }
            default: {
                console.log(`🟢 ${message.text}`);
            }
        }
    }
    switch (mode) {
        case OutputMode.Json: {
            const filename = 'envcheck-results.json';
            await writeToFile(filename, JSON.stringify(result, null, 4));
            console.log(t('info.jsonResults', { filename }));
            break;
        }
        case OutputMode.Markdown: {
            const markdown = convertResultsToMarkdown(result);
            const filename = 'envcheck-results.md';
            await writeToFile(filename, markdown);
            console.log(t('info.markdownResults', { filename }));
            break;
        }
        case OutputMode.Zip: {
            storeResultsZip(result);
            break;
        }
        default: {
            break;
        }
    }
}

/**
 * Callback in case user credentials are required.
 *
 * @param destination - destination info with Name, Host, ...
 * @returns user input for username and password
 */
async function credentialCallback(destination: Endpoint): Promise<{ username: string; password: string }> {
    console.log(t('info.authRequired', { destination: destination.Name }));
    const { username, password } = await prompts([
        {
            type: 'text',
            name: 'username',
            message: 'Username: '
        },
        {
            type: 'password',
            name: 'password',
            message: 'Password: '
        }
    ]);
    return { username, password };
}

/**
 * Main function that checks command line arguments and calls environment check.
 *
 */
export async function cli(): Promise<void> {
    try {
        const cliArgs = minimist(process.argv.slice(2));

        if (cliArgs.h || cliArgs.help) {
            showHelp();
            return;
        }
        const options = getOptions(cliArgs) || {};
        options.credentialCallback = credentialCallback;
        const result = await checkEnvironment(options);
        const outputMode = Object.keys(OutputMode).find((key) => OutputMode[key] === cliArgs.output)
            ? (cliArgs.output as OutputMode)
            : undefined;
        await outputResults(result, outputMode);
    } catch (error) {
        console.error(t('error.checkingEnv', { error }));
    }
}

/**
 * Execute directly when this file is loaded.
 */
cli();

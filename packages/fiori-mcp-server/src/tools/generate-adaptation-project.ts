import type { GenerateAdaptationProjectOutput, GenerateAdaptationProjectInput } from '../types/index.js';
import { isAbsolute, join } from 'node:path';
import { promises as FSpromises } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { runCmdArgs, logger } from '../utils/index.js';
import { fetchKeyUserChanges } from './generate-adaptation-project/key-user-changes.js';
import { getDefaultProjectName } from '@sap-ux/adp-tooling';

/** Maximum time to wait for the key user changes fetch before aborting generation. */
const KEY_USER_CHANGES_TIMEOUT_MS = 60_000;

/** Maximum time to allow the adaptation project generator to run before it is terminated. */
const GENERATION_TIMEOUT_MS = 5 * 60_000;

/**
 * Returns true if `yo` is available on PATH. Used to avoid re-downloading
 * Yeoman via `npx -y` on every invocation (slow on cold/corporate networks).
 *
 * @returns `true` if `yo` is on PATH, `false` otherwise.
 */
function isYoAvailable(): boolean {
    try {
        const cmd = process.platform === 'win32' ? 'where' : 'which';
        execFileSync(cmd, ['yo'], { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

/**
 * Builds the command + args to invoke the {@link https://www.npmjs.com/package/@sap-ux/adp-tooling | sap-ux/adp} Yeoman generator.
 * Uses the globally-installed `yo` when available to avoid network round-trips;
 * falls back to `npx -y yo@4` for fresh environments.
 *
 * @param jsonString - JSON-serialised generator options to pass as a positional argument.
 * @returns An object containing the command string and its argument array.
 */
function buildGeneratorCommand(jsonString: string): { cmd: string; args: string[] } {
    if (isYoAvailable()) {
        return { cmd: 'yo', args: ['@sap-ux/adp', jsonString, '--force'] };
    }
    return { cmd: 'npx', args: ['-y', 'yo@4', '@sap-ux/adp', jsonString, '--force'] };
}

/**
 * Rejects with a descriptive error if the given promise does not settle within `timeoutMs`.
 *
 * @param promise - The promise to race against the timeout.
 * @param timeoutMs - Maximum milliseconds to wait before rejecting.
 * @param onTimeoutMessage - The error message used when the timeout fires.
 * @returns A promise that resolves with the value of `promise` or rejects on timeout.
 */
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, onTimeoutMessage: string): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error(onTimeoutMessage)), timeoutMs);
    });
    try {
        return await Promise.race([promise, timeout]);
    } finally {
        if (timer) {
            clearTimeout(timer);
        }
    }
}

/**
 * Copies non-empty optional fields from `fields` into `target`.
 *
 * @param target - The object to write the fields into.
 * @param fields - Optional input fields; undefined and empty-string values are skipped.
 */
function applyOptionalFields(
    target: Record<string, unknown>,
    fields: Partial<
        Pick<GenerateAdaptationProjectInput, 'namespace' | 'applicationTitle' | 'client' | 'username' | 'password'>
    >
): void {
    for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined && value !== '') {
            target[key] = value;
        }
    }
}

/**
 * Generates a new SAP Fiori adaptation project by invoking the `sap-ux/adp` Yeoman generator.
 *
 * @param params - Input parameters for the adaptation project generation.
 * @returns A promise resolving to the execution output.
 */
export async function generateAdaptationProject(
    params: GenerateAdaptationProjectInput
): Promise<GenerateAdaptationProjectOutput> {
    const {
        system,
        application,
        appPath,
        targetFolder,
        projectName,
        namespace,
        applicationTitle,
        client,
        username,
        password,
        importKeyUserChanges
    } = params;

    if (!system || !application) {
        return { status: 'Error', message: 'Missing required parameters: system and application are required.' };
    }

    const finalTargetFolder = targetFolder ?? appPath;

    if (!isAbsolute(finalTargetFolder)) {
        return { status: 'Error', message: `targetFolder must be an absolute path. Received: "${finalTargetFolder}"` };
    }

    try {
        const jsonInput: Record<string, unknown> & { projectName: string } = {
            system,
            application,
            targetFolder: finalTargetFolder,
            projectName: projectName ?? getDefaultProjectName(finalTargetFolder)
        };

        applyOptionalFields(jsonInput, { namespace, applicationTitle, client, username, password });

        if (importKeyUserChanges) {
            const keyUserChanges = await withTimeout(
                fetchKeyUserChanges({
                    system,
                    application,
                    client,
                    username,
                    password,
                    logger
                }),
                KEY_USER_CHANGES_TIMEOUT_MS,
                `Fetching key user changes for '${application}' on '${system}' timed out after ` +
                    `${KEY_USER_CHANGES_TIMEOUT_MS}ms. The system may be unreachable or require credentials; ` +
                    'pass "username" and "password" or set importKeyUserChanges to false.'
            );
            if (keyUserChanges.length > 0) {
                jsonInput.keyUserChanges = keyUserChanges;
            } else {
                return {
                    status: 'Error',
                    message:
                        `importKeyUserChanges was requested but no key user changes were returned for '${application}' on '${system}'. ` +
                        'Set importKeyUserChanges to false to generate the project without importing changes.'
                };
            }
        }

        await FSpromises.mkdir(finalTargetFolder, { recursive: true });

        // Pass the JSON payload as a single argv element (not interpolated into a shell string) so
        // quotes, spaces or apostrophes in values cannot corrupt it. A corrupted payload would make
        // the generator silently fall back to interactive prompts and hang with no attached stdin.
        const jsonString = JSON.stringify(jsonInput);
        const { cmd, args } = buildGeneratorCommand(jsonString);
        const { stdout, stderr } = await runCmdArgs(cmd, args, {
            cwd: finalTargetFolder,
            timeout: GENERATION_TIMEOUT_MS
        });

        if (stdout) {
            logger.info(stdout);
        }
        if (stderr) {
            logger.warn(stderr);
        }

        const projectPath = join(finalTargetFolder, jsonInput.projectName);
        return {
            status: 'Success',
            message: `Adaptation project generated successfully at ${projectPath}.`,
            projectPath
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Error generating adaptation project: ${message}`);
        return { status: 'Error', message: `Error generating adaptation project: ${message}` };
    }
}

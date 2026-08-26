import type { ExecuteFunctionalityOutput, GenerateAdaptationProjectInput } from '../types/index.js';
import { join } from 'node:path';
import { existsSync, promises as FSpromises } from 'node:fs';
import { runCmdArgs, logger } from '../utils/index.js';
import { GENERATE_ADAPTATION_PROJECT_ID } from '../constant.js';
import { fetchKeyUserChanges } from './generate-adaptation-project/key-user-changes.js';

/** Maximum time to wait for the key user changes fetch before aborting generation. */
const KEY_USER_CHANGES_TIMEOUT_MS = 60_000;

/** Maximum time to allow the adaptation project generator to run before it is terminated. */
const GENERATION_TIMEOUT_MS = 5 * 60_000;

/**
 * Rejects with a descriptive error if the given promise does not settle within `timeoutMs`.
 *
 * @param promise - The promise to guard.
 * @param timeoutMs - Timeout in milliseconds.
 * @param onTimeoutMessage - Error message used when the timeout elapses.
 * @returns The resolved value of `promise` if it settles in time.
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
 * Generates a new SAP Fiori adaptation project by invoking the @sap-ux/adp Yeoman generator.
 *
 * @param params - Input parameters for the adaptation project generation.
 * @returns A promise resolving to the execution output.
 */
export async function generateAdaptationProject(
    params: GenerateAdaptationProjectInput
): Promise<ExecuteFunctionalityOutput> {
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
        return {
            functionalityId: GENERATE_ADAPTATION_PROJECT_ID,
            status: 'Error',
            message: 'Missing required parameters: system and application are required.',
            parameters: params,
            appPath,
            changes: [],
            timestamp: new Date().toISOString()
        };
    }

    const finalTargetFolder = targetFolder ?? appPath;

    try {
        const jsonInput: Record<string, unknown> & { projectName: string } = {
            system,
            application,
            targetFolder: finalTargetFolder,
            projectName: projectName ?? getDefaultProjectName(finalTargetFolder)
        };

        if (namespace) {
            jsonInput.namespace = namespace;
        }
        if (applicationTitle) {
            jsonInput.applicationTitle = applicationTitle;
        }
        if (client) {
            jsonInput.client = client;
        }
        if (username) {
            jsonInput.username = username;
        }
        if (password) {
            jsonInput.password = password;
        }

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
            // Only attach a payload when we have content so we don't override
            // the user's intent with an empty array.
            if (keyUserChanges.length > 0) {
                jsonInput.keyUserChanges = keyUserChanges;
            } else {
                logger.warn(
                    `importKeyUserChanges was requested but no key user changes were returned for '${application}'.`
                );
            }
        }

        await FSpromises.mkdir(finalTargetFolder, { recursive: true });

        // Pass the JSON payload as a single argv element (not interpolated into a shell string) so
        // quotes, spaces or apostrophes in values cannot corrupt it. A corrupted payload would make
        // the generator silently fall back to interactive prompts and hang with no attached stdin.
        const jsonString = JSON.stringify(jsonInput);
        const { stdout, stderr } = await runCmdArgs('npx', ['-y', 'yo@4', '@sap-ux/adp', jsonString, '--force'], {
            cwd: process.cwd(),
            timeout: GENERATION_TIMEOUT_MS
        });

        logger.info(stdout);
        if (stderr) {
            logger.error(stderr);
        }

        const projectPath = join(finalTargetFolder, jsonInput.projectName);
        return {
            functionalityId: GENERATE_ADAPTATION_PROJECT_ID,
            status: 'Success',
            message: `Adaptation project generated successfully at ${projectPath}.`,
            parameters: params,
            appPath: projectPath,
            changes: [],
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        logger.error(`Error generating adaptation project: ${error}`);
        return {
            functionalityId: GENERATE_ADAPTATION_PROJECT_ID,
            status: 'Error',
            message: 'Error generating adaptation project: ' + (error instanceof Error ? error.message : String(error)),
            parameters: params,
            appPath,
            changes: [],
            timestamp: new Date().toISOString()
        };
    }
}

function getDefaultProjectName(basePath: string, dirName: string = 'app.variant'): string {
    let newDir = dirName;
    let index = 1;

    while (existsSync(join(basePath, newDir))) {
        index++;
        newDir = `${dirName}${index}`;
    }

    return newDir;
}

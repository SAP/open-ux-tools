import type { GenerateAdaptationProjectOutput, GenerateAdaptationProjectInput } from '../types/index.js';
import { isAbsolute, join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { runCmdArgs, logger } from '../utils/index.js';
import {
    fetchKeyUserChanges,
    getConfiguredProvider,
    getDefaultProjectName,
    getSupportedProject,
    loadApps,
    SupportedProject
} from '@sap-ux/adp-tooling';
import { AdaptationProjectType } from '@sap-ux/axios-extension';

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
    fields: Partial<Pick<GenerateAdaptationProjectInput, 'namespace' | 'applicationTitle' | 'client'>>
): void {
    for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined && value !== '') {
            target[key] = value;
        }
    }
}

// Outcome of resolving the project type: a concrete type, a prompt for the user (both types
// valid and none chosen), or an error (the requested type is not supported).
type ProjectTypeResolution =
    | { kind: 'resolved'; projectType: AdaptationProjectType }
    | { kind: 'inputRequired'; message: string }
    | { kind: 'error'; message: string };

/**
 * Builds an error resolution for a projectType the system/application cannot support.
 *
 * @param subject - The system or application the message refers to.
 * @param supported - Human-readable name of the only supported type ("Cloud Ready"/"Classic").
 * @param requested - The unsupported projectType value that was requested.
 * @returns An `error` project type resolution.
 */
function unsupportedTypeError(subject: string, supported: string, requested: string): ProjectTypeResolution {
    return {
        kind: 'error',
        message: `${subject} supports only ${supported} adaptation projects, but projectType '${requested}' was requested.`
    };
}

/**
 * Resolves the project type for a system/application, mirroring the interactive generator:
 * single-type systems resolve automatically, a mixed system offers a real choice only for a
 * released cloud application, and a requested type the system cannot support yields an error.
 *
 * @param system - The name of the SAP system.
 * @param application - The application ID to adapt.
 * @param client - Optional SAP client number.
 * @param requested - The project type explicitly requested by the caller, if any.
 * @returns A promise resolving to the project type resolution outcome.
 */
async function resolveProjectType(
    system: string,
    application: string,
    client: string | undefined,
    requested: AdaptationProjectType | undefined
): Promise<ProjectTypeResolution> {
    const provider = await getConfiguredProvider({ system, client }, logger);
    const supportedProject = await getSupportedProject(provider);

    if (supportedProject === SupportedProject.CLOUD_READY) {
        if (requested === AdaptationProjectType.ON_PREMISE) {
            return unsupportedTypeError(`System '${system}'`, 'Cloud Ready', 'onPremise');
        }
        return { kind: 'resolved', projectType: AdaptationProjectType.CLOUD_READY };
    }

    if (supportedProject === SupportedProject.ON_PREM) {
        if (requested === AdaptationProjectType.CLOUD_READY) {
            return unsupportedTypeError(`System '${system}'`, 'Classic', 'cloudReady');
        }
        return { kind: 'resolved', projectType: AdaptationProjectType.ON_PREMISE };
    }

    // Mixed system: the application's released status decides whether a genuine choice exists.
    const apps = await loadApps(provider, true, supportedProject);
    const status = apps.find((entry) => entry.id === application)?.cloudDevAdaptationStatus;

    // A released cloud application is the only case with a real choice.
    if (status === 'released') {
        if (requested) {
            return { kind: 'resolved', projectType: requested };
        }
        return {
            kind: 'inputRequired',
            message:
                `The system '${system}' and application '${application}' support BOTH Cloud Ready and ` +
                'Classic adaptation projects. Ask the user whether they want "Cloud Ready" or "Classic", ' +
                'then call generate_adaptation_project again with projectType set to ' +
                "'cloudReady' (for Cloud Ready) or 'onPremise' (for Classic)."
        };
    }

    // A positively identified classic application can only be on-premise.
    if (status === '') {
        if (requested === AdaptationProjectType.CLOUD_READY) {
            return unsupportedTypeError(
                `Application '${application}' is a classic application and`,
                'Classic',
                'cloudReady'
            );
        }
        return { kind: 'resolved', projectType: AdaptationProjectType.ON_PREMISE };
    }

    // Status unknown (app not in the index): honour an explicit request, else default to on-premise.
    return { kind: 'resolved', projectType: requested ?? AdaptationProjectType.ON_PREMISE };
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
        projectType,
        appPath,
        targetFolder,
        projectName,
        namespace,
        applicationTitle,
        client,
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
        // The zod schema restricts projectType to the AdaptationProjectType values, so the string
        // is a safe stand-in for the enum type when passed to the resolver.
        const resolution = await resolveProjectType(
            system,
            application,
            client,
            projectType as AdaptationProjectType | undefined
        );

        if (resolution.kind === 'inputRequired') {
            return { status: 'InputRequired', message: resolution.message };
        }
        if (resolution.kind === 'error') {
            return { status: 'Error', message: resolution.message };
        }

        const jsonInput: Record<string, unknown> & { projectName: string } = {
            system,
            application,
            projectType: resolution.projectType,
            targetFolder: finalTargetFolder,
            projectName: projectName ?? getDefaultProjectName(finalTargetFolder)
        };

        applyOptionalFields(jsonInput, { namespace, applicationTitle, client });

        if (importKeyUserChanges) {
            const keyUserChanges = await withTimeout(
                fetchKeyUserChanges({
                    system,
                    application,
                    client,
                    logger
                }),
                KEY_USER_CHANGES_TIMEOUT_MS,
                `Fetching key user changes for '${application}' on '${system}' timed out after ` +
                    `${KEY_USER_CHANGES_TIMEOUT_MS}ms. The system may be unreachable; ` +
                    'set importKeyUserChanges to false.'
            );
            if (keyUserChanges.length > 0) {
                jsonInput.keyUserChanges = keyUserChanges;
            } else {
                logger.info(
                    `No key user changes found for '${application}' on '${system}'; proceeding without importing changes.`
                );
            }
        }

        mkdirSync(finalTargetFolder, { recursive: true });

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

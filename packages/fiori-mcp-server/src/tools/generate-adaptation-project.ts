import type { GenerateAdaptationProjectOutput, GenerateAdaptationProjectInput } from '../types/index.js';
import { isAbsolute, join } from 'node:path';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { runCmdArgs, logger } from '../utils/index.js';
import {
    AppRouterType,
    fetchKeyUserChanges,
    findServiceInstancesForApp,
    getConfiguredProvider,
    getDefaultProjectName,
    getSupportedProject,
    isCfInstalled,
    isLoggedInCf,
    loadApps,
    loadCfConfig,
    SupportedProject
} from '@sap-ux/adp-tooling';
import { AdaptationProjectType } from '@sap-ux/axios-extension';
import { isInternalFeaturesSettingEnabled } from '@sap-ux/feature-toggle';

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
 * Resolves the project type when internal features are enabled: Cloud Ready is never available,
 * so a Cloud-Ready-only system or an explicit cloudReady request is an error and everything else
 * resolves to Classic (on-premise).
 *
 * @param system - The name of the SAP system.
 * @param supportedProject - The project type(s) the system supports.
 * @param requested - The project type explicitly requested by the caller, if any.
 * @returns The project type resolution outcome.
 */
function resolveInternalProjectType(
    system: string,
    supportedProject: SupportedProject,
    requested: AdaptationProjectType | undefined
): ProjectTypeResolution {
    if (supportedProject === SupportedProject.CLOUD_READY) {
        return {
            kind: 'error',
            message:
                `System '${system}' supports only Cloud Ready adaptation projects, which cannot be ` +
                'created while internal features are enabled. Use a system that supports Classic.'
        };
    }
    if (requested === AdaptationProjectType.CLOUD_READY) {
        return {
            kind: 'error',
            message:
                'Cloud Ready adaptation projects are not available with internal features enabled. ' +
                'Only Classic adaptation projects can be created.'
        };
    }
    return { kind: 'resolved', projectType: AdaptationProjectType.ON_PREMISE };
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

    if (isInternalFeaturesSettingEnabled()) {
        return resolveInternalProjectType(system, supportedProject, requested);
    }

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

    const apps = await loadApps(provider, true, supportedProject);
    const status = apps.find((entry) => entry.id === application)?.cloudDevAdaptationStatus;

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

    if (status === '') {
        if (requested === AdaptationProjectType.CLOUD_READY) {
            return {
                kind: 'error',
                message:
                    `Application '${application}' is a classic application, so Cloud Ready adaptation ` +
                    'projects are not available. Only Classic adaptation projects can be created.'
            };
        }
        return { kind: 'resolved', projectType: AdaptationProjectType.ON_PREMISE };
    }

    return { kind: 'resolved', projectType: requested ?? AdaptationProjectType.ON_PREMISE };
}

/**
 * Best-effort removal of the staged key user changes temp file; a cleanup failure is logged, not thrown.
 *
 * @param filePath - Absolute path to the staged temp file, or `undefined` if nothing was staged.
 */
function cleanupKeyUserChangesFile(filePath: string | undefined): void {
    if (!filePath) {
        return;
    }
    try {
        rmSync(filePath, { force: true });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.warn(`Failed to clean up key user changes temp file '${filePath}': ${message}`);
    }
}

/**
 * Generates a new SAP Fiori adaptation project by invoking the `sap-ux/adp` Yeoman generator.
 *
 * The target is selected solely by `targetEnvironment` ('ABAP' or 'CF') nothing is inferred from the
 * other parameters. When `targetEnvironment` is missing the tool returns `InputRequired` so the caller
 * asks the user which target to use.
 *
 * @param params - Input parameters for the adaptation project generation.
 * @returns A promise resolving to the execution output.
 */
export async function generateAdaptationProject(
    params: GenerateAdaptationProjectInput
): Promise<GenerateAdaptationProjectOutput> {
    const { targetEnvironment, application, appPath, targetFolder } = params;

    if (!application) {
        return { status: 'Error', message: 'Missing required parameter: application is required.' };
    }

    const finalTargetFolder = targetFolder ?? appPath;

    if (!isAbsolute(finalTargetFolder)) {
        return { status: 'Error', message: `targetFolder must be an absolute path. Received: "${finalTargetFolder}"` };
    }

    if (targetEnvironment !== 'ABAP' && targetEnvironment !== 'CF') {
        return {
            status: 'InputRequired',
            message:
                'Specify the target: this can generate an ABAP or a Cloud Foundry adaptation project. ' +
                'Ask the user which they want, then call generate_adaptation_project again with ' +
                "targetEnvironment set to 'ABAP' or 'CF'. Do NOT guess - a system alone does not imply ABAP."
        };
    }

    return targetEnvironment === 'CF' ? runCfFlow(params, finalTargetFolder) : runAbapFlow(params, finalTargetFolder);
}

/**
 * ABAP adaptation project flow: resolves the ABAP project type (onPremise/cloudReady), optionally
 * stages key user changes, and invokes the generator. Unchanged behaviour from the original tool.
 *
 * @param params - Input parameters for the adaptation project generation.
 * @param finalTargetFolder - The validated absolute target folder.
 * @returns A promise resolving to the execution output.
 */
async function runAbapFlow(
    params: GenerateAdaptationProjectInput,
    finalTargetFolder: string
): Promise<GenerateAdaptationProjectOutput> {
    const { system, application, projectType, projectName, namespace, applicationTitle, client, importKeyUserChanges } =
        params;

    if (!system) {
        return { status: 'Error', message: 'Missing required parameter: system is required for an ABAP project.' };
    }

    let keyUserChangesFilePath: string | undefined;

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
                const id = randomUUID();
                keyUserChangesFilePath = join(tmpdir(), `${id}.txt`);
                writeFileSync(keyUserChangesFilePath, JSON.stringify({ keyUserChanges }), 'utf8');
                jsonInput.id = id;
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
    } finally {
        cleanupKeyUserChangesFile(keyUserChangesFilePath);
    }
}

/**
 * Cloud Foundry adaptation project flow: detects the CF login (never performing it), discovers which
 * service instance exposes the requested application, and invokes the generator with a CF JSON payload.
 *
 * @param params - Input parameters for the adaptation project generation.
 * @param finalTargetFolder - The validated absolute target folder.
 * @returns A promise resolving to the execution output.
 */
async function runCfFlow(
    params: GenerateAdaptationProjectInput,
    finalTargetFolder: string
): Promise<GenerateAdaptationProjectOutput> {
    const {
        application,
        projectName,
        namespace,
        applicationTitle,
        serviceInstanceName,
        mtaMode: requestedMtaMode,
        mtaId,
        businessSolutionName,
        approuter,
        importKeyUserChanges
    } = params;

    try {
        const cfConfig = loadCfConfig(logger);

        // Detection only — this tool never runs `cf login` on the user's behalf.
        if (!(await isCfInstalled(logger))) {
            return {
                status: 'Error',
                message:
                    'The Cloud Foundry CLI ("cf") is not installed. Install it and run `cf login`, then call ' +
                    'generate_adaptation_project again.'
            };
        }

        const loggedIn = await isLoggedInCf(cfConfig, logger);
        if (!loggedIn || !cfConfig.org?.Name || !cfConfig.space?.GUID) {
            const endpoint = cfConfig.url ? `https://api.cf.${cfConfig.url}` : '<API endpoint>';
            return {
                status: 'Error',
                message:
                    'You are not logged in to a Cloud Foundry org and space. Run ' +
                    `\`cf login -a ${endpoint} --sso\`, select an org and space, then call ` +
                    'generate_adaptation_project again.'
            };
        }

        let resolvedServiceInstanceName = serviceInstanceName;
        if (!resolvedServiceInstanceName) {
            const matches = await findServiceInstancesForApp(application, cfConfig, logger);
            if (matches.length === 0) {
                return {
                    status: 'Error',
                    message:
                        `No Cloud Foundry service instance in org '${cfConfig.org.Name}' / space ` +
                        `'${cfConfig.space.Name}' exposes application '${application}'. Verify the application id ` +
                        'and that you are targeting the correct org and space.'
                };
            }
            if (matches.length === 1) {
                resolvedServiceInstanceName = matches[0].name;
            } else {
                const names = matches.map((match) => match.name).join(', ');
                return {
                    status: 'InputRequired',
                    message:
                        `Multiple Cloud Foundry service instances expose application '${application}': ${names}. ` +
                        'Ask the user which one to use, then call generate_adaptation_project again with ' +
                        'serviceInstanceName set to the chosen value.'
                };
            }
        }

        const mtaMode = requestedMtaMode ?? 'existing';
        if (mtaMode === 'new' && !mtaId) {
            return {
                status: 'Error',
                message:
                    'mtaMode "new" requires mtaId (the MTA project id/name of the folder to create). ' +
                    'Provide mtaId and call generate_adaptation_project again.'
            };
        }

        if (importKeyUserChanges) {
            logger.info('importKeyUserChanges is not supported for Cloud Foundry adaptation projects; ignoring it.');
        }

        const jsonInput: Record<string, unknown> = {
            targetEnv: 'CF',
            application,
            serviceInstanceName: resolvedServiceInstanceName,
            mtaMode,
            targetFolder: finalTargetFolder
        };

        applyOptionalFields(jsonInput, { namespace, applicationTitle });
        if (projectName) {
            jsonInput.projectName = projectName;
        }
        if (mtaId) {
            jsonInput.mtaId = mtaId;
        }
        if (businessSolutionName) {
            jsonInput.businessSolutionName = businessSolutionName;
        }
        if (approuter) {
            jsonInput.approuter = approuter === 'managed' ? AppRouterType.MANAGED : AppRouterType.STANDALONE;
        }

        mkdirSync(finalTargetFolder, { recursive: true });

        // Pass the JSON payload as a single argv element (see the ABAP flow for the rationale).
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

        const projectPath = mtaMode === 'new' && mtaId ? join(finalTargetFolder, mtaId) : finalTargetFolder;

        return {
            status: 'Success',
            message: `Cloud Foundry adaptation project generated successfully at ${projectPath}.`,
            projectPath
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Error generating adaptation project: ${message}`);
        return { status: 'Error', message: `Error generating adaptation project: ${message}` };
    }
}

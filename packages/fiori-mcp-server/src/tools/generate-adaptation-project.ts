import type { GenerateAdaptationProjectOutput, GenerateAdaptationProjectInput } from '../types/index.js';
import { isAbsolute, join } from 'node:path';
import { mkdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { runCmdArgs, logger } from '../utils/index.js';
import { GenerateAdaptationProjectInputSchema } from '../types/input.js';
import {
    generationError,
    preflightError,
    preflightStep,
    validateAttributes,
    validateCfApplication,
    validateGenerationFolder,
    validationError
} from '../utils/adaptation-project-validation.js';
import {
    AppRouterType,
    fetchKeyUserChanges,
    findServiceInstancesForApp,
    getConfiguredProvider,
    getDefaultProjectName,
    getApprouterType,
    getModuleNames,
    hasApprouter,
    getSupportedProject,
    isCfInstalled,
    isLoggedInCf,
    loadApps,
    loadCfConfig,
    SupportedProject,
    SourceManifest,
    validateBusinessSolutionName,
    validateMtaId,
    validateProjectPath
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
 * Builds the command + args to invoke the {@link https://www.npmjs.com/package/@sap-ux/generator-adp | @sap-ux/generator-adp} Yeoman generator.
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
    | { kind: 'error'; message: string; field?: string; code?: string };

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
    const provider = await preflightStep('system', 'system_unavailable', () =>
        getConfiguredProvider({ system, client }, logger)
    );
    const supportedProject = await preflightStep('system', 'system_unavailable', () => getSupportedProject(provider));
    const apps = await preflightStep('application', 'application_discovery_failed', () =>
        loadApps(provider, !isInternalFeaturesSettingEnabled(), supportedProject)
    );
    const baseApp = apps.find((entry) => entry.id === application);
    if (!baseApp) {
        return {
            kind: 'error',
            field: 'application',
            code: 'application_not_found',
            message: 'Application ' + application + ' is not available for adaptation on system ' + system + '.'
        };
    }
    await preflightStep('application', 'application_metadata_unavailable', () =>
        new SourceManifest(provider, application).getManifest()
    );

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

    const status = baseApp.cloudDevAdaptationStatus;

    if (status === 'released') {
        if (requested) {
            return { kind: 'resolved', projectType: requested };
        }
        return {
            kind: 'inputRequired',
            message:
                `The system '${system}' and application '${application}' support both Cloud Ready and ` +
                'Classic adaptation projects. projectType is required to select one.'
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
 * Generates a new SAP Fiori adaptation project by invoking the `@sap-ux/generator-adp` Yeoman generator.
 *
 * The target is selected solely by `targetEnvironment` ('ABAP' or 'CF') nothing is inferred from the
 * other parameters. When `targetEnvironment` is missing the tool returns `InputRequired` so the caller
 * asks the user which target to use.
 *
 * @param input - Untrusted input parameters for the adaptation project generation.
 * @returns A promise resolving to the execution output.
 */
export async function generateAdaptationProject(input: unknown): Promise<GenerateAdaptationProjectOutput> {
    const parsed = GenerateAdaptationProjectInputSchema.safeParse(input);
    if (!parsed.success) {
        const issues = parsed.error.issues.flatMap((issue) => {
            const fields = issue.code === 'unrecognized_keys' ? issue.keys : [issue.path.join('.')];
            return fields.map((field) => ({ field, code: issue.code, message: issue.message }));
        });
        return {
            status: 'Error',
            phase: 'validation',
            message: issues.map((issue) => issue.message).join(' '),
            issues
        };
    }
    const params = parsed.data;
    const { targetEnvironment, appPath, targetFolder } = params;

    const finalTargetFolder = targetFolder ?? appPath;

    for (const [field, folder] of [
        ['appPath', appPath],
        ['targetFolder', targetFolder]
    ] as const) {
        if (folder !== undefined && !isAbsolute(folder)) {
            return generationError(
                field,
                field + ' must be an absolute path. Received: "' + folder + '"',
                'invalid_path'
            );
        }
    }
    const folderError = validateGenerationFolder(
        finalTargetFolder,
        targetFolder === undefined ? 'appPath' : 'targetFolder'
    );
    if (folderError) {
        return folderError;
    }

    if (targetEnvironment !== 'ABAP' && targetEnvironment !== 'CF') {
        return {
            status: 'InputRequired',
            message: 'targetEnvironment is required before generation.',
            missingFields: ['targetEnvironment'],
            choices: {
                targetEnvironment: [
                    { value: 'ABAP', label: 'ABAP' },
                    { value: 'CF', label: 'Cloud Foundry' }
                ]
            }
        };
    }
    if (targetEnvironment === 'CF' && params.mtaMode === 'new') {
        if (!params.mtaId) {
            return {
                status: 'InputRequired',
                message: 'mtaId is required when mtaMode is new.',
                missingFields: ['mtaId']
            };
        }
        const error = validationError('mtaId', validateMtaId(params.mtaId));
        if (error) {
            return error;
        }
    }

    return targetEnvironment === 'CF' ? runCfFlow(params, finalTargetFolder) : runAbapFlow(params, finalTargetFolder);
}

/**
 * ABAP adaptation project flow: resolves the ABAP project type (onPremise/cloudReady), optionally
 * stages key user changes, validates attributes, and invokes the generator.
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
        return {
            status: 'InputRequired',
            message: 'system is required for an ABAP project.',
            missingFields: ['system']
        };
    }

    let keyUserChangesFilePath: string | undefined;

    try {
        const jsonInput: Record<string, unknown> & { projectName: string } = {
            system,
            application,
            targetFolder: finalTargetFolder,
            projectName: projectName ?? getDefaultProjectName(finalTargetFolder)
        };
        applyOptionalFields(jsonInput, { namespace, applicationTitle, client });
        const attributeError = validateAttributes(
            { ...params, projectName: jsonInput.projectName },
            finalTargetFolder,
            false
        );
        if (attributeError) {
            return attributeError;
        }
        // The schema restricts projectType to the values of the existing AdaptationProjectType enum.
        const resolution = await resolveProjectType(
            system,
            application,
            client,
            projectType as AdaptationProjectType | undefined
        );
        if (resolution.kind === 'inputRequired') {
            return {
                status: 'InputRequired',
                message: resolution.message,
                missingFields: ['projectType'],
                choices: {
                    projectType: [
                        { value: 'cloudReady', label: 'Cloud Ready' },
                        { value: 'onPremise', label: 'Classic' }
                    ]
                }
            };
        }
        if (resolution.kind === 'error') {
            return generationError(
                resolution.field ?? 'projectType',
                resolution.message,
                resolution.code ?? 'unsupported_project_type'
            );
        }
        jsonInput.projectType = resolution.projectType;

        if (importKeyUserChanges) {
            const keyUserChanges = await preflightStep('importKeyUserChanges', 'key_user_changes_unavailable', () =>
                withTimeout(
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
                )
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

        return await runGeneration(jsonInput, finalTargetFolder, join(finalTargetFolder, jsonInput.projectName));
    } catch (error) {
        return preflightError(error);
    } finally {
        cleanupKeyUserChangesFile(keyUserChangesFilePath);
    }
}

/**
 * Validates the CF destination before service discovery and resolves the adaptation app name.
 *
 * @param params - Generation inputs.
 * @param finalTargetFolder - The absolute MTA root or new-MTA parent folder.
 * @param cfConfig - Current CF login context.
 * @returns The resolved destination, or a structured validation error.
 */
function resolveCfDestination(
    params: GenerateAdaptationProjectInput,
    finalTargetFolder: string,
    cfConfig: ReturnType<typeof loadCfConfig>
): { mtaMode: 'new' | 'existing'; mtaRoot: string; projectName: string } | GenerateAdaptationProjectOutput {
    const {
        mtaMode: requestedMtaMode,
        mtaId,
        projectName: requestedProjectName,
        approuter,
        businessSolutionName
    } = params;
    const mtaMode = requestedMtaMode ?? 'existing';
    const pathError = validationError(
        params.targetFolder === undefined ? 'appPath' : 'targetFolder',
        validateProjectPath(finalTargetFolder, logger, mtaMode, cfConfig.space?.GUID ? cfConfig : undefined)
    );
    if (pathError) {
        return pathError;
    }
    if (mtaMode === 'new' && mtaId) {
        const mtaError = validationError('mtaId', validateMtaId(mtaId, finalTargetFolder));
        if (mtaError) {
            return mtaError;
        }
    }
    const mtaRoot = mtaMode === 'new' && mtaId ? join(finalTargetFolder, mtaId) : realpathSync(finalTargetFolder);
    const projectName = requestedProjectName ?? getDefaultProjectName(mtaRoot);
    const attributeError = validateAttributes({ ...params, projectName }, mtaRoot, true);
    if (attributeError) {
        return attributeError;
    }

    const explicitApprouter = approuter === 'managed' ? AppRouterType.MANAGED : AppRouterType.STANDALONE;
    const defaultApprouter = mtaMode === 'new' || approuter ? AppRouterType.MANAGED : getApprouterType(mtaRoot);
    const resolvedApprouter = approuter ? explicitApprouter : defaultApprouter;
    if (
        businessSolutionName?.trim() &&
        resolvedApprouter === AppRouterType.MANAGED &&
        (mtaMode === 'new' || !hasApprouter(getModuleNames(mtaRoot)))
    ) {
        const businessSolutionError = validationError(
            'businessSolutionName',
            validateBusinessSolutionName(businessSolutionName.trim())
        );
        if (businessSolutionError) {
            return businessSolutionError;
        }
    }

    return { mtaMode, mtaRoot, projectName };
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
        namespace,
        applicationTitle,
        serviceInstanceName,
        mtaId,
        businessSolutionName,
        approuter,
        importKeyUserChanges
    } = params;

    try {
        const cfConfig = loadCfConfig(logger);
        const destination = resolveCfDestination(params, finalTargetFolder, cfConfig);
        if ('status' in destination) {
            return destination;
        }
        const { mtaRoot, mtaMode, projectName } = destination;

        // Detection only — this tool never runs `cf login` on the user's behalf.
        if (!(await preflightStep('targetEnvironment', 'cf_cli_unavailable', () => isCfInstalled(logger)))) {
            return generationError(
                'targetEnvironment',
                'The Cloud Foundry CLI ("cf") is not installed.',
                'cf_cli_unavailable'
            );
        }

        const loggedIn = await preflightStep('targetEnvironment', 'cf_login_required', () =>
            isLoggedInCf(cfConfig, logger)
        );
        if (!loggedIn || !cfConfig.org?.Name || !cfConfig.space?.Name || !cfConfig.space?.GUID) {
            const endpoint = cfConfig.url ? `https://api.cf.${cfConfig.url}` : '<API endpoint>';
            const message =
                'You are not logged in to a Cloud Foundry org and space. Run ' +
                'cf login -a ' +
                endpoint +
                ' --sso and select an org and space.';
            return generationError('targetEnvironment', message, 'cf_login_required');
        }

        let resolvedServiceInstanceName = serviceInstanceName;
        if (!resolvedServiceInstanceName) {
            const { matches, incompleteInstances } = await preflightStep(
                'serviceInstanceName',
                'service_discovery_failed',
                () => findServiceInstancesForApp(application, cfConfig, logger)
            );
            if (incompleteInstances.length > 0) {
                return {
                    status: 'InputRequired',
                    message:
                        'Cloud Foundry service discovery is incomplete. Select a service instance explicitly; unresolved instances may also expose the application.',
                    missingFields: ['serviceInstanceName'],
                    choices: {
                        serviceInstanceName: [...matches, ...incompleteInstances.map((entry) => entry.instance)].map(
                            (instance) => ({ value: instance.name, label: instance.name })
                        )
                    },
                    issues: incompleteInstances.map((entry) => ({
                        field: 'serviceInstanceName',
                        code: entry.code,
                        message: entry.message
                    }))
                };
            }
            if (matches.length === 0) {
                return generationError(
                    'application',
                    'No Cloud Foundry service instance in org ' +
                        cfConfig.org.Name +
                        ' / space ' +
                        cfConfig.space.Name +
                        ' exposes application ' +
                        application +
                        '.',
                    'application_not_found'
                );
            }
            if (matches.length === 1) {
                resolvedServiceInstanceName = matches[0].name;
            } else {
                return {
                    status: 'InputRequired',
                    message: `Multiple Cloud Foundry service instances expose application '${application}'.`,
                    missingFields: ['serviceInstanceName'],
                    choices: { serviceInstanceName: matches.map((match) => ({ value: match.name, label: match.name })) }
                };
            }
        }

        const applicationError = await validateCfApplication(resolvedServiceInstanceName, application, cfConfig);
        if (applicationError) {
            return applicationError;
        }

        if (importKeyUserChanges) {
            logger.info('importKeyUserChanges is not supported for Cloud Foundry adaptation projects; ignoring it.');
        }

        const jsonInput: Record<string, unknown> = {
            targetEnv: 'CF',
            application,
            serviceInstanceName: resolvedServiceInstanceName,
            mtaMode,
            projectName,
            targetFolder: finalTargetFolder
        };

        applyOptionalFields(jsonInput, { namespace, applicationTitle });
        if (mtaId) {
            jsonInput.mtaId = mtaId;
        }
        if (businessSolutionName) {
            jsonInput.businessSolutionName = businessSolutionName;
        }
        if (approuter) {
            jsonInput.approuter = approuter === 'managed' ? AppRouterType.MANAGED : AppRouterType.STANDALONE;
        }

        return await runGeneration(jsonInput, finalTargetFolder, join(mtaRoot, projectName), mtaRoot);
    } catch (error) {
        return preflightError(error);
    }
}

/**
 * Executes creation only after all local and backend validation has passed.
 *
 * @param jsonInput - Validated generator configuration.
 * @param targetFolder - Generator working directory.
 * @param projectPath - Resolved adaptation application path.
 * @param mtaRoot - Containing MTA for CF, omitted for ABAP.
 * @returns Success or a structured generation failure.
 */
async function runGeneration(
    jsonInput: Record<string, unknown>,
    targetFolder: string,
    projectPath: string,
    mtaRoot?: string
): Promise<GenerateAdaptationProjectOutput> {
    try {
        if (!mtaRoot) {
            mkdirSync(targetFolder, { recursive: true });
        }
        // Keep the JSON configuration as a single argv element so shell quoting cannot corrupt it.
        const { cmd, args } = buildGeneratorCommand(JSON.stringify(jsonInput));
        const { stdout, stderr } = await runCmdArgs(cmd, args, { cwd: targetFolder, timeout: GENERATION_TIMEOUT_MS });
        if (stdout) {
            logger.info(stdout);
        }
        if (stderr) {
            logger.warn(stderr);
        }
        return {
            status: 'Success',
            message: 'Adaptation project generated successfully at ' + projectPath + '.',
            projectPath,
            ...(mtaRoot ? { mtaRoot } : {})
        };
    } catch (error) {
        const message =
            'Error generating adaptation project: ' + (error instanceof Error ? error.message : String(error));
        logger.error(message);
        return generationError('generation', message, 'generation_failed', 'generation');
    }
}

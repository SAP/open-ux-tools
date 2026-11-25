import { accessSync, constants, existsSync, statSync } from 'node:fs';
import { dirname } from 'node:path';
import { validateClient, validateNamespaceAdp, validateProjectName } from '@sap-ux/project-input-validator';
import {
    downloadAppContent,
    findServiceInstancesForApp,
    getAdpServiceInstances,
    getBusinessServiceInfo,
    getCfApps,
    validateODataEndpoints,
    validateSmartTemplateApplication
} from '@sap-ux/adp-tooling';
import type { CfConfig } from '@sap-ux/adp-tooling';
import { isInternalFeaturesSettingEnabled } from '@sap-ux/feature-toggle';
import type { GenerateAdaptationProjectInput, GenerateAdaptationProjectOutput } from '../types/index.js';
import { logger } from './index.js';

/** A backend preflight failure associated with a specific generation input. */
export class GenerationValidationError extends Error {
    /**
     * Associates a diagnostic with its input field and stable error code.
     *
     * @param field - Input field involved in the failed check.
     * @param code - Machine-readable diagnostic code.
     * @param message - Diagnostic returned by the shared validator or backend.
     */
    constructor(
        readonly field: string,
        readonly code: string,
        message: string
    ) {
        super(message);
    }
}

/**
 * Builds a consistent error result for validation and execution failures.
 *
 * @param field - Input or operation involved in the failure.
 * @param message - Human-readable diagnostic.
 * @param code - Machine-readable error code.
 * @param phase - Whether the failure preceded creation or occurred during creation.
 * @returns Structured tool error.
 */
export function generationError(
    field: string,
    message: string,
    code = 'invalid_input',
    phase: 'validation' | 'generation' = 'validation'
): GenerateAdaptationProjectOutput {
    return { status: 'Error', phase, message, issues: [{ field, code, message }] };
}

/**
 * Converts a shared validator result to a field-specific tool error.
 *
 * @param field - Validated field.
 * @param result - Shared validator result.
 * @returns Error result, or undefined when valid.
 */
export function validationError(field: string, result: string | boolean): GenerateAdaptationProjectOutput | undefined {
    if (result === true) {
        return undefined;
    }
    const message = typeof result === 'string' ? result : 'Invalid ' + field + '.';
    return generationError(field, message);
}

/**
 * Wraps backend diagnostics with their input field without parsing command output.
 *
 * @param field - Input checked by the operation.
 * @param code - Diagnostic code for a failed operation.
 * @param operation - Preflight backend operation.
 * @returns The operation's result.
 */
export async function preflightStep<T>(field: string, code: string, operation: () => Promise<T>): Promise<T> {
    try {
        return await operation();
    } catch (error) {
        throw new GenerationValidationError(field, code, error instanceof Error ? error.message : String(error));
    }
}

/**
 * Converts thrown preflight failures into the same result as local validation errors.
 *
 * @param error - Backend or filesystem failure.
 * @returns Structured error with a stable phase and field.
 */
export function preflightError(error: unknown): GenerateAdaptationProjectOutput {
    if (error instanceof GenerationValidationError) {
        return generationError(error.field, error.message, error.code);
    }
    return generationError('configuration', error instanceof Error ? error.message : String(error), 'preflight_failed');
}

/**
 * Checks that the destination can contain generated files without creating any folders.
 * Missing ABAP destinations are allowed when their nearest existing ancestor is writable.
 *
 * @param folder - Absolute generation folder.
 * @param field - Field that supplied the effective destination.
 * @returns Error result, or undefined when valid.
 */
export function validateGenerationFolder(folder: string, field: string): GenerateAdaptationProjectOutput | undefined {
    try {
        let ancestor = folder;
        while (!existsSync(ancestor) && dirname(ancestor) !== ancestor) {
            ancestor = dirname(ancestor);
        }
        if (!statSync(ancestor).isDirectory()) {
            return generationError(field, 'The generation destination must be a directory.', 'invalid_path');
        }
        accessSync(ancestor, constants.W_OK);
    } catch (error) {
        return generationError(
            field,
            'The generation destination is not writable: ' + (error instanceof Error ? error.message : String(error)),
            'invalid_path'
        );
    }
    return undefined;
}

/**
 * Validates project names, namespaces and ABAP clients using the standalone generator's libraries.
 * Reports independent attribute failures together so callers can correct them in one pass.
 *
 * @param params - Inputs with the resolved project name.
 * @param projectRoot - Destination containing the adaptation app.
 * @param isCf - Whether the CF naming rules apply.
 * @returns Aggregated validation error, or undefined when valid.
 */
export function validateAttributes(
    params: GenerateAdaptationProjectInput & { projectName: string },
    projectRoot: string,
    isCf: boolean
): GenerateAdaptationProjectOutput | undefined {
    const isCustomerBase = !isInternalFeaturesSettingEnabled();
    const namespace = params.namespace ?? (isCustomerBase ? 'customer.' + params.projectName : params.projectName);
    const errors = [
        validationError('projectName', validateProjectName(params.projectName, projectRoot, isCustomerBase, isCf)),
        validationError('namespace', validateNamespaceAdp(namespace, params.projectName, isCustomerBase)),
        !isCf ? validationError('client', validateClient(params.client ?? '')) : undefined
    ];
    const issues = errors.flatMap((error) => error?.issues ?? []);
    return issues.length
        ? { status: 'Error', phase: 'validation', message: issues.map((issue) => issue.message).join(' '), issues }
        : undefined;
}

/**
 * Resolves a service name from complete CF discovery or returns the required selection/diagnostic.
 * Explicitly supplied service names bypass discovery in the caller and are validated separately.
 *
 * @param application - Requested base application ID.
 * @param cfConfig - Current authenticated CF org and space context.
 * @returns A uniquely discovered service name, or a structured selection/validation result.
 */
export async function resolveCfServiceInstanceName(
    application: string,
    cfConfig: CfConfig
): Promise<string | GenerateAdaptationProjectOutput> {
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
        return matches[0].name;
    } else {
        return {
            status: 'InputRequired',
            message: `Multiple Cloud Foundry service instances expose application '${application}'.`,
            missingFields: ['serviceInstanceName'],
            choices: { serviceInstanceName: matches.map((match) => ({ value: match.name, label: match.name })) }
        };
    }
}

/**
 * Validates the selected live CF service, its base application and application compatibility.
 * Reuses the standalone generator's APIs and validators. Service resolution may create keys;
 * downloading application metadata may provision the HTML5 repository runtime service.
 *
 * @param serviceInstanceName - Selected live service instance name.
 * @param application - Requested base application ID.
 * @param cfConfig - Active CF org and space context.
 * @returns Error result, or undefined when all backend checks pass.
 */
export async function validateCfApplication(
    serviceInstanceName: string,
    application: string,
    cfConfig: CfConfig
): Promise<GenerateAdaptationProjectOutput | undefined> {
    const instances = await preflightStep('serviceInstanceName', 'service_discovery_failed', () =>
        getAdpServiceInstances(cfConfig.space.GUID, logger)
    );
    if (!instances.some((instance) => instance.name === serviceInstanceName)) {
        return {
            ...generationError(
                'serviceInstanceName',
                'Service instance ' +
                    serviceInstanceName +
                    ' does not exist or cannot be used for adaptation in the selected CF space.',
                'service_instance_not_found'
            ),
            choices: {
                serviceInstanceName: instances.map((instance) => ({ value: instance.name, label: instance.name }))
            }
        };
    }
    const serviceInfo = await preflightStep('serviceInstanceName', 'service_credentials_unavailable', () =>
        getBusinessServiceInfo(serviceInstanceName, cfConfig, logger)
    );
    if (!serviceInfo?.serviceKeys?.length) {
        return generationError(
            'serviceInstanceName',
            'No service credentials are available for ' + serviceInstanceName + '.',
            'service_credentials_unavailable'
        );
    }
    const apps = await preflightStep('application', 'application_discovery_failed', () =>
        getCfApps(serviceInfo.serviceKeys, cfConfig, logger)
    );
    const baseApp = apps.find((app) => app.appId === application);
    if (!baseApp) {
        return {
            ...generationError(
                'application',
                'Application ' + application + ' is not exposed by service instance ' + serviceInstanceName + '.',
                'application_not_found'
            ),
            choices: { application: apps.map((app) => ({ value: app.appId, label: app.title || app.appId })) }
        };
    }
    const content = await preflightStep('application', 'application_metadata_unavailable', () =>
        downloadAppContent(cfConfig.space.GUID, baseApp, logger)
    );
    await preflightStep('application', 'unsupported_application', () =>
        validateSmartTemplateApplication(content.manifest)
    );
    await preflightStep('application', 'inconsistent_odata_endpoints', () =>
        validateODataEndpoints(content.entries, serviceInfo.serviceKeys, logger)
    );
    return undefined;
}

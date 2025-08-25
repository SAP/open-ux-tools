import type {
    ExecuteFunctionalitiesInput,
    ExecuteFunctionalityOutput,
    GetFunctionalityDetailsOutput,
    Parameter
} from '../types';
import { getFunctionalityDetails, resolveFunctionality } from './get-functionality-details';
import type { PropertyPath } from '../page-editor-api';
import { PageEditorApi } from '../page-editor-api';
import { FUNCTIONALITIES_HANDLERS } from './functionalities';
import { resolveApplication } from './utils';

/**
 * Executes a functionality based on the provided parameters.
 *
 * @param params - Input parameters for executing the functionality
 * @returns A promise that resolves to the execution output
 * @throws Error if required parameters are missing
 */
export async function executeFunctionality(params: ExecuteFunctionalitiesInput): Promise<ExecuteFunctionalityOutput> {
    const { functionalityId, parameters, appPath } = params;
    if (!functionalityId) {
        throw new Error('functionalityId parameter is required');
    }
    if (!appPath) {
        throw new Error('appPath parameter is required');
    }
    // Custom/external functionalities
    const externalFunctionality =
        typeof functionalityId === 'string' ? FUNCTIONALITIES_HANDLERS.get(functionalityId) : undefined;
    if (externalFunctionality) {
        return externalFunctionality.executeFunctionality(params);
    }

    // Get functionality details to validate parameters
    const functionality = await getFunctionalityDetails({
        appPath,
        functionalityId
    });

    // Validate required parameters
    const missingParams = functionality.parameters
        .filter((param) => param.required && !(param.id in parameters))
        .map((param) => param.name);

    if (missingParams.length > 0) {
        throw new Error(`Missing required parameters: ${missingParams.join(', ')}`);
    }

    const changes = await generateChanges(functionality, functionalityId, parameters, appPath, functionality.pageName);
    let executionResult: ExecuteFunctionalityOutput;
    if (changes.length) {
        // Mock execution - in a real implementation, this would modify the actual files
        executionResult = {
            functionalityId,
            status: 'success',
            message: `Successfully executed '${functionality.name}'`,
            parameters,
            appPath,
            changes,
            timestamp: new Date().toISOString()
        };
    } else {
        // No changes register
        executionResult = {
            functionalityId,
            status: 'skipped',
            message: `Execution of '${functionality.name}' did not trigger any change in files`,
            parameters,
            appPath,
            changes,
            timestamp: new Date().toISOString()
        };
    }

    return executionResult;
}

/**
 * Generates changes based on the functionality and parameters.
 *
 * @param functionality - Details of the functionality to be executed
 * @param functionalityId - ID of the functionality
 * @param parametersValue - Values for the parameters
 * @param appPath - Path to the application
 * @param pageName - Optional name of the page
 * @returns A promise that resolves to an array of change descriptions
 */
async function generateChanges(
    functionality: GetFunctionalityDetailsOutput,
    functionalityId: string | string[],
    parametersValue: { [key: string]: unknown },
    appPath: string,
    pageName?: string
): Promise<string[]> {
    const changes: string[] = [];
    const editor = await getEditorApi(appPath, pageName);
    if (!editor) {
        return [];
    }
    const { propertyPath } = resolveFunctionality(functionalityId);
    const changedParameterInfo = findParameterById(functionality, propertyPath[propertyPath.length - 1]);

    let changed = false;
    if (!changedParameterInfo && typeof parametersValue === 'object') {
        // Parameters most likely in node parameters - edge case
        for (const parameterValue in parametersValue) {
            const paramPropertyPath = [...propertyPath, parameterValue];
            const parameterInfo = findParameterById(functionality, parameterValue);
            if (parameterInfo) {
                await editor.changeProperty(
                    paramPropertyPath,
                    resolveParameterValue(paramPropertyPath, parametersValue, parameterInfo)
                );
                changed = true;
                if (changes.length === 0) {
                    changes.push('Modified webapp/manifest.json');
                }
            }
        }
    }

    if (!changed) {
        // Common way to change property - AI passes precise property id and parameters
        await editor.changeProperty(
            propertyPath,
            resolveParameterValue(propertyPath, parametersValue, changedParameterInfo)
        );
        // problem -> result?.manifestChangeIndicator does not return changed indicator when we change fcl
        changes.push('Modified webapp/manifest.json');
    }

    return changes;
}

/**
 * Retrieves the PageEditorApi instance for the given application path and page name.
 *
 * @param appPath - Path to the application
 * @param pageName - Optional name of the page
 * @returns A promise that resolves to a PageEditorApi instance or undefined
 */
export async function getEditorApi(appPath: string, pageName?: string): Promise<PageEditorApi | undefined> {
    const project = await resolveApplication(appPath);
    if (project?.applicationAccess) {
        return new PageEditorApi(project.applicationAccess, pageName);
    }
    return undefined;
}

/**
 * Currently resolved values through params passed differently time to time by AI.
 * This method tries to resolve value before applying/saving it.
 *
 * @param propertyPath - Path to the property
 * @param parametersValue - Object containing parameter values
 * @param parameterInfo - Optional information about the parameter
 * @returns The resolved parameter value
 */
function resolveParameterValue(
    propertyPath: PropertyPath,
    parametersValue: { [key: string]: unknown },
    parameterInfo?: Parameter
): unknown {
    const propertyName = propertyPath[propertyPath.length - 1];
    if (parameterInfo?.type === 'object') {
        let value: unknown = parametersValue;
        if (propertyName in parametersValue) {
            // Change property is part of parameters object
            value = parametersValue[propertyName];
        }
        if (value === null || (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0)) {
            // AI fails to pass undefined value, it is more stablew with null - currently workaround is to convert it to 'undefined'
            // So far there is no valid property with value null - such transformation seems ok
            value = undefined;
        }
        // Whole object is received as parameters
        return value;
    }
    let value;
    if (propertyName in parametersValue) {
        // Change property is part of parameters object
        value = parametersValue[propertyName];
    } else if ('value' in parametersValue) {
        // Seems generic approach from AI - property named 'value' contains new value
        value = parametersValue.value;
    }
    if (value === null) {
        // AI fails to pass undefined value, it is more stablew with null - currently workaround is to convert it to 'undefined'
        // So far there is no valid property with value null - such transformation seems ok
        value = undefined;
    }
    return value;
}

/**
 * Finds a parameter in the functionality details by its ID.
 *
 * @param functionality - Details of the functionality
 * @param id - ID of the parameter to find
 * @returns The found Parameter object or undefined if not found
 */
function findParameterById(functionality: GetFunctionalityDetailsOutput, id?: string | number): Parameter | undefined {
    return functionality.parameters.find((parameter) => parameter.id === id);
}

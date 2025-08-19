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

// function generateMockChanges(functionalityId: string, parameters: any): string[] {
//     const changes: string[] = [];

//     switch (functionalityId) {
//         case 'add-table-column':
//             changes.push(
//                 `Modified webapp/manifest.json: Added column '${parameters.columnName}' to table configuration`
//             );
//             changes.push(`Updated table binding with property path '${parameters.propertyPath}'`);
//             break;

//         case 'switch-flexible-layout':
//             changes.push('Modified webapp/manifest.json: Updated routing configuration for FCL');
//             changes.push('Modified webapp/view/App.view.xml: Replaced layout with sap.f.FlexibleColumnLayout');
//             changes.push('Updated webapp/controller/App.controller.js: Added FCL navigation logic');
//             break;

//         case 'add-filter-field':
//             changes.push(
//                 `Modified webapp/manifest.json: Added filter field '${parameters.fieldName}' to SmartFilterBar`
//             );
//             changes.push(
//                 `Configured ${parameters.controlType || 'Input'} control for property '${parameters.propertyPath}'`
//             );
//             break;

//         case 'enable-draft-mode':
//             changes.push('Modified webapp/manifest.json: Enabled draft handling configuration');
//             changes.push('Updated object page settings for draft operations');
//             if (parameters.autosaveInterval > 0) {
//                 changes.push(`Configured auto-save with ${parameters.autosaveInterval}s interval`);
//             }
//             break;

//         case 'add-custom-action':
//             changes.push(
//                 `Modified webapp/manifest.json: Added custom action '${parameters.actionName}' to table toolbar`
//             );
//             changes.push(`Created controller extension for action handler '${parameters.actionId}'`);
//             break;

//         case 'configure-variant-management':
//             changes.push('Modified webapp/manifest.json: Enabled SmartVariantManagement');
//             changes.push('Configured variant management settings');
//             break;

//         case 'add-chart-view':
//             changes.push('Modified webapp/manifest.json: Added SmartChart configuration');
//             changes.push(
//                 `Configured ${parameters.chartType} chart with dimension '${parameters.dimensionField}' and measure '${parameters.measureField}'`
//             );
//             changes.push('Added view switching controls');
//             break;

//         case 'enable-export-functionality':
//             changes.push('Modified webapp/manifest.json: Enabled export functionality in SmartTable');
//             if (parameters.enableExcelExport) {
//                 changes.push('Added Excel export capability');
//             }
//             if (parameters.enablePdfExport) {
//                 changes.push('Added PDF export capability');
//             }
//             break;

//         default:
//             changes.push(`Executed functionality '${functionalityId}' with provided parameters`);
//     }

//     return changes;
// }

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

export async function getEditorApi(appPath: string, pageName?: string): Promise<PageEditorApi | undefined> {
    const project = await resolveApplication(appPath);
    if (project?.applicationAccess) {
        return new PageEditorApi(project.applicationAccess, pageName);
    }
    return undefined;
}

// Currently resolved values through params passed differently time to time by AI.
// This method tries to resolve value before applying/saving it.
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

function findParameterById(functionality: GetFunctionalityDetailsOutput, id?: string | number): Parameter | undefined {
    return functionality.parameters.find((parameter) => parameter.id === id);
}

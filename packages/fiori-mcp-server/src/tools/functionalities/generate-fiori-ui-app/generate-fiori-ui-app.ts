import { command } from './command';
import { GeneratorConfigSchemaCAP } from './schema';
import { GENERATE_FIORI_UI_APP_ID } from '../../../constant';
import type {
    ExecuteFunctionalityInput,
    ExecuteFunctionalityOutput,
    FunctionalityHandlers,
    GetFunctionalityDetailsInput,
    GetFunctionalityDetailsOutput
} from '../../../types';
import { convertToSchema } from '../../utils';

export const GENERATE_FIORI_UI_APP: GetFunctionalityDetailsOutput = {
    functionalityId: GENERATE_FIORI_UI_APP_ID,
    name: 'Generate SAP Fiori UI Application',
    description: `Creates (generates) a new SAP Fiori UI application within an existing CAP project.
                To populate parameters, you **MUST** use the ***CDS MCP*** to search the model for service definitions, entities, associations, and UI annotations.
                As a fallback, only if no such tool is available, you should manually read and parse all .cds files in the projectPath to extract this information.
                The data obtained from either method must then be formatted into a JSON object and passed as the parameters.
                The configuration **MUST** be a valid JSON object corresponding to the inputSchema of the tool.
                The configuration **MUST** be based on the project files in the projectPath.`,
    parameters: convertToSchema(GeneratorConfigSchemaCAP())
};

/**
 * Retrieves the details of the Generate SAP Fiori UI Application functionality.
 *
 * @param input
 * @returns A promise that resolves to the functionality details output.
 */
async function getFunctionalityDetails(input: GetFunctionalityDetailsInput): Promise<GetFunctionalityDetailsOutput> {
    const details = GENERATE_FIORI_UI_APP;
    return {
        ...details,
        parameters: convertToSchema(GeneratorConfigSchemaCAP(input.appPath))
    };
}

/**
 * Executes the Generate SAP Fiori UI Application functionality.
 *
 * @param params - The input parameters for executing the functionality.
 * @returns A promise that resolves to the execution output.
 */
async function executeFunctionality(params: ExecuteFunctionalityInput): Promise<ExecuteFunctionalityOutput> {
    return command(params);
}

export const generateFioriUIAppHandlers: FunctionalityHandlers = {
    getFunctionalityDetails,
    executeFunctionality
};

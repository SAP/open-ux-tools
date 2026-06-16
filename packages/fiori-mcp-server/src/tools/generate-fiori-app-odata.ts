import type { ExecuteFunctionalityOutput } from '../types/index.js';
import executeOData from './functionalities/generate-fiori-ui-application/execute-functionality.js';
import { generatorConfigOData, type GeneratorConfigOData } from './schemas/index.js';
import { GENERATE_FIORI_UI_APPLICATION_ID } from '../constant.js';

/**
 * Generates a new SAP Fiori UI application for OData (non-CAP) projects.
 *
 * @param args - Input parameters matching the generatorConfigOData schema.
 * @returns A promise resolving to the generation execution output.
 */
export async function generateFioriAppOData(args: GeneratorConfigOData): Promise<ExecuteFunctionalityOutput> {
    const validated = generatorConfigOData.parse(args);
    return executeOData({
        functionalityId: GENERATE_FIORI_UI_APPLICATION_ID,
        parameters: validated,
        appPath: validated.project?.targetFolder ?? ''
    });
}

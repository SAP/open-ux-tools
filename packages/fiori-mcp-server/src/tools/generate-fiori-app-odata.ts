import type { ExecuteFunctionalityOutput } from '../types/index.js';
import executeOData from './generate-fiori-app-odata-impl.js';
import { generatorConfigOData, type GeneratorConfigOData } from './schemas/index.js';
import { GENERATE_FIORI_UI_APPLICATION_ID } from '../constant.js';

/**
 * Generates a new SAP Fiori UI application for OData (non-CAP) projects.
 *
 * @param args - Input parameters matching the generatorConfigOData schema.
 * @returns A promise resolving to the generation execution output.
 */
export async function generateFioriAppOData(
    args: GeneratorConfigOData
): Promise<Omit<ExecuteFunctionalityOutput, 'functionalityId'>> {
    const validated = generatorConfigOData.parse(args);
    const { functionalityId: _id, ...result } = await executeOData({
        functionalityId: GENERATE_FIORI_UI_APPLICATION_ID,
        parameters: validated,
        appPath: validated.project?.targetFolder ?? ''
    });
    return result;
}

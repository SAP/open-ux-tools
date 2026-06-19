import type { ExecuteFunctionalityOutput } from '../types/index.js';
import { command } from './generate-fiori-app-cap-impl.js';
import { generatorConfigCAP, type GeneratorConfigCAP } from './schemas/index.js';
import { GENERATE_FIORI_UI_APPLICATION_CAP_ID } from '../constant.js';

/**
 * Generates a new SAP Fiori UI application within an existing CAP project.
 *
 * @param args - Input parameters matching the generatorConfigCAP schema.
 * @returns A promise resolving to the generation execution output.
 */
export async function generateFioriAppCap(
    args: GeneratorConfigCAP
): Promise<Omit<ExecuteFunctionalityOutput, 'functionalityId'>> {
    const validated = generatorConfigCAP.parse(args);
    const { functionalityId: _id, ...result } = await command({
        functionalityId: GENERATE_FIORI_UI_APPLICATION_CAP_ID,
        parameters: validated,
        appPath: validated.project?.targetFolder ?? ''
    });
    return result;
}

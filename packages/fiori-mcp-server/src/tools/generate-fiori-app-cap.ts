import type { ExecuteFunctionalityOutput } from '../types/index.js';
import { command } from './functionalities/generate-fiori-ui-application-cap/command.js';
import { generatorConfigCAP, type GeneratorConfigCAP } from './schemas/index.js';
import { GENERATE_FIORI_UI_APPLICATION_CAP_ID } from '../constant.js';

/**
 * Generates a new SAP Fiori UI application within an existing CAP project.
 *
 * @param args - Input parameters matching the generatorConfigCAP schema.
 * @returns A promise resolving to the generation execution output.
 */
export async function generateFioriAppCap(args: GeneratorConfigCAP): Promise<ExecuteFunctionalityOutput> {
    const validated = generatorConfigCAP.parse(args);
    return command({
        functionalityId: GENERATE_FIORI_UI_APPLICATION_CAP_ID,
        parameters: validated,
        appPath: validated.project?.targetFolder ?? ''
    });
}

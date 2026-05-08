import type { ExecuteFunctionalityOutput } from '../types';
import executeOData from './functionalities/generate-fiori-ui-application/execute-functionality';

/**
 * Generates a new SAP Fiori UI application for OData (non-CAP) projects.
 *
 * @param args - Input parameters matching the generatorConfigOData schema.
 * @returns A promise resolving to the generation execution output.
 */
export async function generateFioriAppOData(args: Record<string, unknown>): Promise<ExecuteFunctionalityOutput> {
    return executeOData({
        functionalityId: 'generate-fiori-ui-application',
        parameters: args,
        appPath: ((args.project as Record<string, unknown>)?.targetFolder as string) ?? ''
    });
}

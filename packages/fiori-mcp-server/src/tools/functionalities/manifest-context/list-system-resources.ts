import type {
    ExecuteFunctionalityInput,
    ExecuteFunctionalityOutput,
    FunctionalityHandlers,
    GetFunctionalityDetailsInput,
    GetFunctionalityDetailsOutput
} from '../../../types';
import { AdpMetadataInputSchema } from '../../../types/input';
import { convertToSchema } from '../../../utils';
import { LIST_SYSTEM_RESOURCES_FUNCTIONALITY_ID } from '../../../constant';
import { getAvailableLibraryFromSystem, getAvailableODataServices, writeContextFile } from './manifestContext';

export const LIST_SYSTEM_RESOURCES_FUNCTIONALITY: GetFunctionalityDetailsOutput = {
    functionalityId: LIST_SYSTEM_RESOURCES_FUNCTIONALITY_ID,
    name: 'List UI5 libraries and OData services available in the connected SAP system',
    description:
        'Queries the SAP system configured in the adaptation project (via ui5.yaml) and returns both the UI5 libraries that ship with an app descriptor and the OData services (V2 and V4) exposed by the system catalog. Use this when adding an OData service to the manifest and you need to discover what is available on the target system. The result is a JSON object `{ libraries, odataServices }` returned in the response `message` field. Pass `saveLocal: true` to also persist the two lists as `webapp/.context/libraries.json` and `webapp/.context/odata-services.json` for agent consumption.',
    parameters: convertToSchema(AdpMetadataInputSchema)
};

/**
 * Returns the static functionality descriptor for `list-system-resources`.
 *
 * @param _input - The input parameters for getting functionality details (unused).
 * @returns A promise resolving to the functionality details output.
 */
async function getFunctionalityDetails(_input: GetFunctionalityDetailsInput): Promise<GetFunctionalityDetailsOutput> {
    return LIST_SYSTEM_RESOURCES_FUNCTIONALITY;
}

/**
 * Lists the UI5 libraries and OData services available in the SAP system
 * configured for the adaptation project at `input.appPath`. When
 * `parameters.saveLocal` is true, also persists both lists as JSON under
 * `webapp/.context/` for agent consumption.
 *
 * @param input - The input parameters for executing the functionality.
 * @returns A promise resolving to the execution output. The combined payload
 *   `{ libraries, odataServices }` is JSON-encoded into the `message` field;
 *   `changes` lists any files written when `saveLocal` was requested.
 */
async function executeFunctionality(input: ExecuteFunctionalityInput): Promise<ExecuteFunctionalityOutput> {
    const { appPath, parameters, functionalityId } = input;
    const [libraries, odataServices] = await Promise.all([
        getAvailableLibraryFromSystem(appPath),
        getAvailableODataServices(appPath, '')
    ]);

    const changes: string[] = [];
    if (parameters?.saveLocal === true) {
        await Promise.all([
            writeContextFile(appPath, 'libraries.json', JSON.stringify(libraries, null, 4)),
            writeContextFile(appPath, 'odata-services.json', JSON.stringify(odataServices, null, 4))
        ]);
        changes.push('Wrote webapp/.context/libraries.json', 'Wrote webapp/.context/odata-services.json');
    }

    return {
        functionalityId,
        status: 'success',
        message: JSON.stringify({ libraries, odataServices }),
        parameters,
        appPath,
        changes,
        timestamp: new Date().toISOString()
    };
}

export const listSystemResourcesHandlers: FunctionalityHandlers = {
    getFunctionalityDetails,
    executeFunctionality
};

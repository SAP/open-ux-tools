import type { GetFunctionalityDetailsOutput } from '../../../types';
import { generatorConfigODataJson as parameters } from '../../schemas';

export default {
    functionalityId: 'generate-fiori-ui-odata-app',
    name: 'Generate SAP Fiori UI Application for OData Projects (non-CAP)',
    description: `Creates (generates) a new SAP Fiori UI application within an existing project (RAP or other non-CAP). Steps:

        1. Crucially, you must first construct the appGenConfig JSON argument.
            - If the user has not provided a valid servicePath and host (URL) of the OData service they want to use, you **MUST** ask for it.

            - If the user mentioned that a service belongs to a SAP system, you **MUST** first retrieve the service's metadata (using the "fetch-service-metadata" functionality with "execute_functionality" tool).
                This tool will store the metadata EDMX file in the user selected folder as metadata.xml for the next step, and provide you with service's host, servicePath and client, needed for the appGenConfig JSON argument.

            - If the user provided a full servicePath and host (URL), you can just query the service metadata (using the system's host (URL) and servicePath) yourself.
                Service metadata endpoint URL must end with "$metadata". If the provided servicePath does not end with "$metadata", you **MUST** append it.
                Once you have the full service metadata endpoint URL, you can make a GET request to retrieve the metadata EDMX file.
                Then store the metadata EDMX file in the user selected folder as metadata.xml for the next step.
                **IMPORTANT**: If the service requires authentication, and it does not belong to a SAP system previously mentioned by the user, you MUST NOT ask the user for credentials!
                Instead, ask them to store the SAP system first and then repeat the request.

        2. Once the metadata EDMX is stored as metadata.xml (either from the "fetch-service-metadata" functionality or your own GET request),
            you can parse the metadata.xml file to understand the data model structure, entities, and associations.

        3. After that, you can proceed to generate the SAP Fiori UI application based on the parsed metadata and the user's requirements.`,
    parameters
} as GetFunctionalityDetailsOutput;

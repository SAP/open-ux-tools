import type { GetFunctionalityDetailsOutput } from '../../../types';
import { generatorConfigODataJson as parameters } from '../../schemas';

export default {
    functionalityId: 'generate-fiori-ui-odata-app',
    name: 'Generate SAP Fiori UI Application for OData Projects (non-CAP)',
    description: `Creates (generates) a new SAP Fiori UI application within an existing project (RAP or other non-CAP).
                Crucially, you must first construct the appGenConfig JSON argument.
                If the user has not provided a valid servicePath and host (URL) of the OData service they want to use, you **MUST** ask for it.
                Next you **MUST** query the service metadata endpoint to retrieve the list of available entities.
                (**IMPORTANT**: service metadata endpoint URL must end with "$metadata". If the provided servicePath does not end with "$metadata", you **MUST** append it.)
                (**IMPORTANT**: if the service requires authentication run 'curl' command to fetch the edmx xml response and allow the user to authenticate if needed).
                Lastly, using the service edmx (response xml from <serviceurl>/$metadata request), figure out the data model structure, entities, and associations.`,
    parameters
} as GetFunctionalityDetailsOutput;

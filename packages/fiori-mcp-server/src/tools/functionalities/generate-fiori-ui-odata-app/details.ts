import type { GetFunctionalityDetailsOutput } from '../../../types';
import { generatorConfigSchemaNonCAPJson } from './schema';

export default {
    functionalityId: 'generate-fiori-ui-odata-app',
    name: 'Generate SAP Fiori UI Application for non-CAP Projects',
    description: `Creates (generates) a new SAP Fiori UI application within an existing project (RAP or other non-CAP).
                Crucially, you must first construct the appGenConfig JSON argument.

                If the user has not provided a valid servicePath and host (URL) of the OData service they want to use,
                you **MUST** first retrieve the list of user stored SAP systems (using the "fetch-system" functionality with "execute_functionality" tool),

                then match the provided name to one of the systems (or ask the user to choose from a list if multiple match),
                and then retrieve the list of services from that system (using the "fetch-system-services" functionality), and ask the user to select one of the services,
                and finally retrieve the corresponding servicePath, host, and client from the selected service.

                Next you **MUST** query the service metadata endpoint to retrieve the list of available entities.
                (**IMPORTANT**: service metadata endpoint URL must end with "$metadata". If the provided servicePath does not end with "$metadata", you **MUST** append it.)
                (**IMPORTANT**: if the service requires authentication, you should use the same username and password that the "fetch-system" functionality returned with the sap-system that the service belongs to.)

                Lastly, using the service edmx (response xml from <serviceurl>/$metadata request), figure out the data model structure, entities, and associations.`,
    parameters: generatorConfigSchemaNonCAPJson
} as GetFunctionalityDetailsOutput;

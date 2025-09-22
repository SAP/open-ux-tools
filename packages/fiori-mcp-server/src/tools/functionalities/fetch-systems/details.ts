import type { GetFunctionalityDetailsOutput } from '../../../types';

import { FETCH_SYSTEMS_ID as functionalityId } from '../../../constant';

export default {
    functionalityId,
    name: 'Generate SAP Fiori UI Application for non-CAP Projects',
    description: `Creates (generates) a new SAP Fiori UI application within an existing project (RAP or other non-CAP).
                Crucially, you must first construct the appGenConfig JSON argument.
                If not provided - you **MUST** ask the user for the servicePath and host of the OData service they want to use.
                Then, you **MUST** query the service metadata endpoint to retrieve the list of available entities.
                (**IMPORTANT**: service metadata endpoint URL must end with "$metadata". If the provided servicePath does not end with "$metadata", you **MUST** append it.)
                Lastly, using the service $metadata response xml, figure out the data model structure, entities, and associations.`,
    parameters: [
        {
            id: 'projectPath',
            type: 'string',
            description:
                'The path to the non-CAP project folder. By default the currently opened project folder should be used.',
            required: true
        }
    ]
} as GetFunctionalityDetailsOutput;

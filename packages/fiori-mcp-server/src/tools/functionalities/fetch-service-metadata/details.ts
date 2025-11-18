import type { GetFunctionalityDetailsOutput } from '../../../types';

export default {
    functionalityId: 'fetch-service-metadata',
    name: 'Fetch Service Metadata',
    description: `(Used by 'generate-fiori-ui-odata-app' functionality).
        Retrieves a list of user stored SAP Systems and matches the name to the one provided by the user.
        Then retrieves the metadata of a specific SAP service from the matched system and path provided by the user.
        Finally, stores the fetched metadata in the appPath folder as metadata.xml,
        and returns service details: host, servicePath, client and metadataFilePath.`,
    parameters: [
        {
            id: 'sapSystemName',
            type: 'string',
            description: 'The name of the SAP system to fetch metadata from.',
            required: false
        },
        {
            id: 'servicePath',
            type: 'string',
            description: 'The path to the SAP service to fetch metadata for.',
            required: true
        }
    ]
} as GetFunctionalityDetailsOutput;

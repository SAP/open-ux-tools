import type { GetFunctionalityDetailsOutput } from '../../../types';

export default {
    functionalityId: 'fetch-service-metadata',
    name: 'Fetch Service Metadata',
    description: `(Used by 'generate-fiori-ui-application' functionality).
        Retrieves a list of user stored SAP Systems and matches the name, host or a URL to the sapSystemQuery provided by the user.
        Then retrieves the metadata of a specific SAP service using the matched SAP system and servicePath provided by the user.
        (if the user provided a full URL - pass the whole URL as sapSystemQuery parameter and just the path as servicePath).
        Finally, it stores the fetched metadata in the appPath folder as metadata.xml,
        and returns service details: host, servicePath, client and metadataFilePath.`,
    parameters: {
        type: 'object',
        required: ['servicePath'],
        properties: {
            sapSystemQuery: {
                type: 'string',
                description: 'The name, host or a URL of the SAP system to fetch service metadata from.'
            },
            servicePath: {
                type: 'string',
                description: 'The path to the SAP service to fetch metadata for.'
            }
        }
    }
} as GetFunctionalityDetailsOutput;

import type { GetFunctionalityDetailsOutput } from '../../../types';

export default {
    functionalityId: 'list-adp-applications',
    name: 'List ADP Applications',
    description: `Lists all available SAP Fiori applications for a given SAP system that can be used for adaptation projects.
    
    This functionality requires:
    - system: The name of the SAP system (obtained from list-adp-systems)
    
    Optional parameters:
    - isCustomerBase: Whether to search for customer base applications (defaults to false/VENDOR layer)
    
    Use this to get a list of available applications before generating an adaptation project.`,
    parameters: {
        type: 'object',
        properties: {
            system: {
                type: 'string',
                description: 'The name of the SAP system (obtained from list-adp-systems)'
            },
            isCustomerBase: {
                type: 'boolean',
                description: 'Optional: Whether to search for customer base applications. Defaults to false (VENDOR layer).'
            }
        },
        required: ['system']
    }
} as GetFunctionalityDetailsOutput;

import type { GetFunctionalityDetailsOutput } from '../../../types';

export default {
    functionalityId: 'generate-adaptation-project',
    name: 'Generate Adaptation Project',
    description: `Generates a new SAP Fiori adaptation project by calling the @sap-ux/adp generator with JSON arguments.
    
    This functionality requires:
    - system: The name of the SAP system (from list-adp-systems)
    - application: The application ID to adapt (from list-adp-applications)
    
    Optional parameters:
    - targetFolder: The target folder where the project will be generated. If not provided, the project will be created in the current directory (appPath).
    - projectName: Name of the project (defaults to application.variant)
    - namespace: Namespace for the project
    - applicationTitle: Title for the application
    - client: SAP client number
    - username: Username for authentication (if needed)
    - password: Password for authentication (if needed)
    
    The generator will be executed with the provided JSON configuration.`,
    parameters: {
        type: 'object',
        properties: {
            system: {
                type: 'string',
                description: 'The name of the SAP system (obtained from list-adp-systems)'
            },
            application: {
                type: 'string',
                description: 'The application ID to adapt (e.g., sap.ui.demoapps.rta.fe)'
            },
            targetFolder: {
                type: 'string',
                description:
                    'Optional: The absolute path to the target folder where the project will be generated. If not provided, the project will be created in the current directory (appPath).'
            },
            projectName: {
                type: 'string',
                description: 'Optional: Name of the project. Defaults to application.variant if not provided'
            },
            namespace: {
                type: 'string',
                description: 'Optional: Namespace for the project'
            },
            applicationTitle: {
                type: 'string',
                description: 'Optional: Title for the application'
            },
            client: {
                type: 'string',
                description: 'Optional: SAP client number'
            },
            username: {
                type: 'string',
                description: 'Optional: Username for authentication'
            },
            password: {
                type: 'string',
                description: 'Optional: Password for authentication'
            }
        },
        required: ['system', 'application']
    }
} as GetFunctionalityDetailsOutput;

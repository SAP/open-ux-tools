import type { GetFunctionalityDetailsOutput } from '../../../types';

export default {
    functionalityId: 'list-systems',
    name: 'List SAP Systems',
    description: `Lists all available SAP systems configured for Fiori applications. 
    This functionality retrieves systems from either Business Application Studio (via destinations) or from the backend system store.
    Use this to get a list of available systems before generating a Fiori application.
    
    **Structure and Usage:**
    - Each system has a \`name\` field (required) and an optional \`client\` field
    - Present the systems in a structured table format to the user with columns: System Name and Client
    - When the user selects a system, use the \`name\` field value as the \`system\` parameter in subsequent functionality calls
    - If a system has no client value, display it as empty or "N/A" in the table
    - The systems can be used with various functionalities that require a system parameter (e.g., fetch-service-metadata)`,
    parameters: {
        type: 'object',
        properties: {},
        required: []
    }
} as GetFunctionalityDetailsOutput;

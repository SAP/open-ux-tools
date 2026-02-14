import type { GetFunctionalityDetailsOutput } from '../../../types';

export default {
    functionalityId: 'list-systems',
    name: 'List SAP Systems',
    description: `Lists all available SAP systems configured SAP Fiori applications and SAPUI5 Adaptation Projects. 
    This functionality retrieves systems from either Business Application Studio (via destinations) or from the backend system store.
    Use this to get a list of available systems before generating an adaptation project.`,
    parameters: {
        type: 'object',
        properties: {},
        required: []
    }
} as GetFunctionalityDetailsOutput;

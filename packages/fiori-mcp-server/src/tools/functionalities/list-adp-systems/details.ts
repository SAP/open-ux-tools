import type { GetFunctionalityDetailsOutput } from '../../../types';
import * as zod from 'zod';

const parameters = zod.object({
    // No parameters needed for listing systems
});

export default {
    functionalityId: 'list-adp-systems',
    name: 'List ADP Systems',
    description: `Lists all available SAP systems configured for adaptation projects. 
    This functionality retrieves systems from either BAS (via destinations) or from the backend system store.
    Use this to get a list of available systems before generating an adaptation project.`,
    parameters: {
        type: 'object',
        properties: {},
        required: []
    }
} as GetFunctionalityDetailsOutput;

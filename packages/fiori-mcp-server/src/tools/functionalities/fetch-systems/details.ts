import type { GetFunctionalityDetailsOutput } from '../../../types';

export default {
    functionalityId: 'fetch-systems',
    name: 'Fetch Systems',
    description: `Retrieves the list of available SAP systems from the user storage.
    This is typically used to populate dropdowns or selection lists in the UI.`,
    parameters: [
        {
            id: 'projectPath',
            type: 'string',
            description:
                'The path to the non-CAP project folder. By default the currently opened project folder should be used.',
            required: true
        },
        {
            id: 'system',
            type: 'string',
            description: 'The name of the SAP system to fetch details for.',
            required: false
        }
    ]
} as GetFunctionalityDetailsOutput;

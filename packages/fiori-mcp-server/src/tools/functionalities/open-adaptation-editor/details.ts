import type { GetFunctionalityDetailsOutput } from '../../../types';

export default {
    functionalityId: 'open-adaptation-editor',
    name: 'Open Adaptation Editor',
    description: `Starts the adaptation editor server by running 'npm run start-editor' in the adaptation project directory.
    
    This functionality:
    - Validates that the project has a 'start-editor' script in package.json
    - Spawns the editor server process in the background
    - Extracts the server URL and editor path from the command output
    - Returns the full editor URL and process ID
    - Provides instructions on how to stop the editor process
    
    The editor server will run independently in the background. Use the returned process ID to stop it if needed.`,
    parameters: {
        type: 'object',
        properties: {},
        required: []
    }
} as GetFunctionalityDetailsOutput;

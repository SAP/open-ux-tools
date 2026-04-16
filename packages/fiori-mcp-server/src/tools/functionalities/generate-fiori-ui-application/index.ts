import type { FunctionalityHandlers, GetFunctionalityDetailsOutput } from '../../../types/index.js';

import details from './details.js';
import executeFunctionality from './execute-functionality.js';

export default {
    id: details.functionalityId as string,
    details,
    handlers: {
        getFunctionalityDetails: (): Promise<GetFunctionalityDetailsOutput> => Promise.resolve(details),
        executeFunctionality
    } as FunctionalityHandlers
};

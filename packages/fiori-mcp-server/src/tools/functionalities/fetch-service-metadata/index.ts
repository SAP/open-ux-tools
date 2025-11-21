import type { FunctionalityHandlers, GetFunctionalityDetailsOutput } from '../../../types';

import details from './details';
import executeFunctionality from './execute-functionality';

export default {
    id: details.functionalityId as string,
    details,
    handlers: {
        getFunctionalityDetails: (): Promise<GetFunctionalityDetailsOutput> => Promise.resolve(details),
        executeFunctionality
    } as FunctionalityHandlers
};

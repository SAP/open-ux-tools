import type { FunctionalityHandlers } from '../../../types/index.js';
import { getFunctionalityDetails } from './get-functionality-details.js';
import { executeFunctionality } from './execute-functionality.js';

export { ADD_BUILDING_BLOCK_FUNCTIONALITY } from './get-functionality-details.js';

export const addBuildingBlockHandlers: FunctionalityHandlers = {
    getFunctionalityDetails,
    executeFunctionality
};

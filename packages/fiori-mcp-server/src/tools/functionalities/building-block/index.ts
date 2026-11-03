import type { FunctionalityHandlers } from '../../../types/index.js';
import { ADD_BUILDING_BLOCK_FUNCTIONALITY, getFunctionalityDetails } from './get-functionality-details.js';
import { executeFunctionality } from './execute-functionality.js';

export { ADD_BUILDING_BLOCK_FUNCTIONALITY };

export const addBuildingBlockHandlers: FunctionalityHandlers = {
    getFunctionalityDetails,
    executeFunctionality
};

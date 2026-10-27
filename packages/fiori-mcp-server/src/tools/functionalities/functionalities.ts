import type { FunctionalityHandlers } from '../../types/index.js';
import {
    ADD_PAGE_FUNCTIONALITY,
    addPageHandlers,
    DELETE_PAGE_FUNCTIONALITY,
    deletePageHandlers
} from './page/index.js';
import {
    CREATE_CONTROLLER_EXTENSION_FUNCTIONALITY,
    createControllerExtensionHandlers
} from './controller-extension/index.js';
import { ADD_BUILDING_BLOCK_FUNCTIONALITY, addBuildingBlockHandlers } from './building-block/index.js';
import {
    ADD_PAGE,
    CREATE_CONTROLLER_EXTENSION_FUNCTIONALITY_ID,
    DELETE_PAGE,
    ADD_BUILDING_BLOCK
} from '../../constant.js';

export const FUNCTIONALITIES_DETAILS = [
    ADD_PAGE_FUNCTIONALITY,
    DELETE_PAGE_FUNCTIONALITY,
    CREATE_CONTROLLER_EXTENSION_FUNCTIONALITY,
    ADD_BUILDING_BLOCK_FUNCTIONALITY
];

export const FUNCTIONALITIES_HANDLERS: Map<string, FunctionalityHandlers> = new Map([
    [ADD_PAGE, addPageHandlers],
    [DELETE_PAGE, deletePageHandlers],
    [CREATE_CONTROLLER_EXTENSION_FUNCTIONALITY_ID, createControllerExtensionHandlers],
    [ADD_BUILDING_BLOCK, addBuildingBlockHandlers]
]);

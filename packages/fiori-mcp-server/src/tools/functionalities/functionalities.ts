import type { FunctionalityHandlers } from '../../types';
import { ADD_PAGE_FUNCTIONALITY, addPageHandlers, DELETE_PAGE_FUNCTIONALITY, deletePageHandlers } from './page';
import { CREATE_CONTROLLER_EXTENSION_FUNCTIONALITY, createControllerExtensionHandlers } from './controller-extension';
import {
    LIST_SYSTEM_RESOURCES_FUNCTIONALITY,
    listSystemResourcesHandlers
} from './manifest-context/list-system-resources';
import {
    ADD_PAGE,
    CREATE_CONTROLLER_EXTENSION_FUNCTIONALITY_ID,
    DELETE_PAGE,
    LIST_SYSTEM_RESOURCES_FUNCTIONALITY_ID
} from '../../constant';

export const FUNCTIONALITIES_DETAILS = [
    ADD_PAGE_FUNCTIONALITY,
    DELETE_PAGE_FUNCTIONALITY,
    CREATE_CONTROLLER_EXTENSION_FUNCTIONALITY,
    LIST_SYSTEM_RESOURCES_FUNCTIONALITY
];

export const FUNCTIONALITIES_HANDLERS: Map<string, FunctionalityHandlers> = new Map([
    [ADD_PAGE, addPageHandlers],
    [DELETE_PAGE, deletePageHandlers],
    [CREATE_CONTROLLER_EXTENSION_FUNCTIONALITY_ID, createControllerExtensionHandlers],
    [LIST_SYSTEM_RESOURCES_FUNCTIONALITY_ID, listSystemResourcesHandlers]
]);

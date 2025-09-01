import type { FunctionalityHandlers } from '../../types';
import { ADD_PAGE_FUNCTIONALITY, addPageHandlers, DELETE_PAGE_FUNCTIONALITY, deletePageHandlers } from './page';
import { CREATE_CONTROLLER_EXTENSION_FUNCTIONALITY, createControllerExtensionHandlers } from './controller-extension';
import { GENERATE_FIORI_UI_APP, generateFioriUIAppHandlers } from './generate-fiori-ui-app';
export const FUNCTIONALITIES_DETAILS = [
    ADD_PAGE_FUNCTIONALITY,
    GENERATE_FIORI_UI_APP,
    DELETE_PAGE_FUNCTIONALITY,
    CREATE_CONTROLLER_EXTENSION_FUNCTIONALITY
];

export const FUNCTIONALITIES_HANDLERS: Map<string, FunctionalityHandlers> = new Map([
    [ADD_PAGE_FUNCTIONALITY.functionalityId, addPageHandlers],
    [DELETE_PAGE_FUNCTIONALITY.functionalityId, deletePageHandlers],
    [GENERATE_FIORI_UI_APP.functionalityId, generateFioriUIAppHandlers],
    [CREATE_CONTROLLER_EXTENSION_FUNCTIONALITY.functionalityId, createControllerExtensionHandlers]
]);

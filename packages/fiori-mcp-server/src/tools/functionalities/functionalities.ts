import type { FunctionalityHandlers } from '../../types';
import { ADD_PAGE_FUNCTIONALITY, addPageHandlers, DELETE_PAGE_FUNCTIONALITY, deletePageHandlers } from './page';
import { CREATE_CONTROLLER_EXTENSION_FUNCTIONALITY, createControllerExtensionHandlers } from './controller-extension';
import { GENERATE_FIORI_UI_APP, generateFioriUIAppHandlers } from './generate-fiori-ui-app';
import { MODIFY_ANNOTATION_FUNCTIONALITY, modifyAnnotationHandlers } from './annotation';

export const FUNCTIONALITIES_DETAILS = [
    ADD_PAGE_FUNCTIONALITY,
    GENERATE_FIORI_UI_APP,
    DELETE_PAGE_FUNCTIONALITY,
    CREATE_CONTROLLER_EXTENSION_FUNCTIONALITY,
    MODIFY_ANNOTATION_FUNCTIONALITY
];

export const FUNCTIONALITIES_HANDLERS: Map<string, FunctionalityHandlers> = new Map([
    [ADD_PAGE_FUNCTIONALITY.id, addPageHandlers],
    [DELETE_PAGE_FUNCTIONALITY.id, deletePageHandlers],
    [GENERATE_FIORI_UI_APP.id, generateFioriUIAppHandlers],
    [CREATE_CONTROLLER_EXTENSION_FUNCTIONALITY.id, createControllerExtensionHandlers],
    [MODIFY_ANNOTATION_FUNCTIONALITY.id, modifyAnnotationHandlers],
    [CREATE_CONTROLLER_EXTENSION_FUNCTIONALITY.id, createControllerExtensionHandlers]
]);

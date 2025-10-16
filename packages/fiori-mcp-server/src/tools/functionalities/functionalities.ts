import type { FunctionalityHandlers } from '../../types';
import { ADD_PAGE_FUNCTIONALITY, addPageHandlers, DELETE_PAGE_FUNCTIONALITY, deletePageHandlers } from './page';
import { CREATE_CONTROLLER_EXTENSION_FUNCTIONALITY, createControllerExtensionHandlers } from './controller-extension';
import { GENERATE_FIORI_UI_APP, generateFioriUIAppHandlers } from './generate-fiori-ui-app';
import {
    ADD_PAGE,
    CREATE_CONTROLLER_EXTENSION_FUNCTIONALITY_ID,
    DELETE_PAGE,
    GENERATE_FIORI_UI_APP_ID
} from '../../constant';

import generateFioriUIodataApp from './generate-fiori-ui-odata-app';

export const FUNCTIONALITIES_DETAILS = [
    ADD_PAGE_FUNCTIONALITY,
    GENERATE_FIORI_UI_APP,
    DELETE_PAGE_FUNCTIONALITY,
    CREATE_CONTROLLER_EXTENSION_FUNCTIONALITY,
    generateFioriUIodataApp.details
];

export const FUNCTIONALITIES_HANDLERS: Map<string, FunctionalityHandlers> = new Map([
    [ADD_PAGE, addPageHandlers],
    [DELETE_PAGE, deletePageHandlers],
    [GENERATE_FIORI_UI_APP_ID, generateFioriUIAppHandlers],
    [CREATE_CONTROLLER_EXTENSION_FUNCTIONALITY_ID, createControllerExtensionHandlers],
    [generateFioriUIodataApp.id, generateFioriUIodataApp.handlers]
]);

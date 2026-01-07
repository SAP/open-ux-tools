import type { FunctionalityHandlers } from '../../types';
import { ADD_PAGE_FUNCTIONALITY, addPageHandlers, DELETE_PAGE_FUNCTIONALITY, deletePageHandlers } from './page';
import { CREATE_CONTROLLER_EXTENSION_FUNCTIONALITY, createControllerExtensionHandlers } from './controller-extension';
import {
    GENERATE_FIORI_UI_APPLICATION_CAP,
    generateFioriUIApplicationCapHandlers
} from './generate-fiori-ui-application-cap';
import {
    ADD_PAGE,
    CREATE_CONTROLLER_EXTENSION_FUNCTIONALITY_ID,
    DELETE_PAGE,
    GENERATE_FIORI_UI_APPLICATION_CAP_ID
} from '../../constant';

import generateFioriUIApplication from './generate-fiori-ui-application';
import fetchServiceMetadata from './fetch-service-metadata';

export const FUNCTIONALITIES_DETAILS = [
    ADD_PAGE_FUNCTIONALITY,
    GENERATE_FIORI_UI_APPLICATION_CAP,
    DELETE_PAGE_FUNCTIONALITY,
    CREATE_CONTROLLER_EXTENSION_FUNCTIONALITY,
    generateFioriUIApplication.details,
    fetchServiceMetadata.details
];

export const FUNCTIONALITIES_HANDLERS: Map<string, FunctionalityHandlers> = new Map([
    [ADD_PAGE, addPageHandlers],
    [DELETE_PAGE, deletePageHandlers],
    [GENERATE_FIORI_UI_APPLICATION_CAP_ID, generateFioriUIApplicationCapHandlers],
    [CREATE_CONTROLLER_EXTENSION_FUNCTIONALITY_ID, createControllerExtensionHandlers],
    [generateFioriUIApplication.id, generateFioriUIApplication.handlers],
    [fetchServiceMetadata.id, fetchServiceMetadata.handlers]
]);

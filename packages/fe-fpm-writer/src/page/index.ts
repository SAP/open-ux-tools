import { validatePageConfig } from './common';
import { generate as generateCustomPage } from './custom';
import { generate as generateListReport } from './list';
import { generate as generateObjectPage } from './object';
import type { CustomPage, ListReport, Navigation, ObjectPage } from './types';

export {
    validatePageConfig,
    generateCustomPage,
    generateObjectPage,
    generateListReport,
    CustomPage,
    ObjectPage,
    ListReport,
    Navigation
};

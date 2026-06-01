import type { CustomPage, ObjectPage, ListReport, Navigation } from './types.js';
import { validatePageConfig } from './common.js';
import { generate as generateCustomPage } from './custom.js';
import { generate as generateObjectPage } from './object.js';
import { generate as generateListReport } from './list.js';

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

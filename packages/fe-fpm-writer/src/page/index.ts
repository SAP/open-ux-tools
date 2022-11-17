import type { CustomPage, ObjectPage, ListReport, Navigation } from './types';
import { validatePageConfig } from './common';
import { generate as generateCustomPage } from './custom';
import { generate as generateObjectPage } from './object';
import { generate as generateListReport } from './list';

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

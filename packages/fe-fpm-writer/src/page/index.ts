import { validatePageConfig } from './common';
import { generate as generateCustomPage } from './custom';
import { generate as generateObjectPage } from './object';
import { generate as generateListReport } from './list';
export type { CustomPage, ObjectPage, ListReport, Navigation } from './types';

export { validatePageConfig, generateCustomPage, generateObjectPage, generateListReport };

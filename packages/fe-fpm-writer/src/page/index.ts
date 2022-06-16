import type { CustomPage, ObjectPage, Navigation } from './types';
import { validatePageConfig } from './common';
import { generate as generateCustomPage } from './custom';
import { generate as generateObjectPage } from './object';

export { validatePageConfig, generateCustomPage, generateObjectPage, CustomPage, ObjectPage, Navigation };

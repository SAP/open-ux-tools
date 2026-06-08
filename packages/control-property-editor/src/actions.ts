import type { changeProperty, initializeLivereload } from './slice.js';

export type Action = ReturnType<typeof changeProperty> | ReturnType<typeof initializeLivereload>;

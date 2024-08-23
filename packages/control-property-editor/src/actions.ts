import type { changeProperty, initializeLivereload } from './slice';

export type Action = ReturnType<typeof changeProperty> | ReturnType<typeof initializeLivereload>;

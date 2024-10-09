import { initIcons } from '@sap-ux/ui-components';

import { initI18n } from '../../src/i18n';
import { registerAppIcons } from '../../src/icons';
import { mockResizeObserver } from '../utils/utils';

mockResizeObserver();
initI18n();
registerAppIcons();
initIcons();

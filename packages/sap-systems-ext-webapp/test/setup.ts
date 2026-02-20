import { initIcons } from '@sap-ux/ui-components';
import { initI18n } from '../src/i18n';

initI18n();
initIcons();

// structuredClone is not available in jsdom
global.structuredClone = (v) => JSON.parse(JSON.stringify(v));

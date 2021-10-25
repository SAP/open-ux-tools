import { FioriApp } from 'types';

export function setAdditionalAppDefaults(app: FioriApp) {
    app.flpAppId = app.flpAppId || `${app.id.replace(/[-_.]/g, '')}-tile`;
}

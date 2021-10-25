import { BasicAppSettings, FioriApp, FreestyleApp, TemplateType } from './types';

function setAppDefaults(app: FioriApp) {
    app.flpAppId = app.flpAppId || `${app.id.replace(/[-_.]/g, '')}-tile`;
}

function setBasicTemplateDefaults(settings: BasicAppSettings) {
    settings.viewName = settings.viewName || 'View1';
}

export function setDefaults(ffApp: FreestyleApp<unknown>) {
    setAppDefaults(ffApp.app);
    if (ffApp.template.type === TemplateType.Basic) {
        setBasicTemplateDefaults(ffApp.template.settings as BasicAppSettings);
    }
}

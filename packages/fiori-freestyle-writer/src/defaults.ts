import { BasicAppSettings, FreestyleApp, TemplateType } from './types';

function setBasicTemplateDefaults(settings: BasicAppSettings) {
    settings.viewName = settings.viewName || 'View1';
}

export function setDefaults(ffApp: FreestyleApp<unknown>) {
    if (ffApp.template.type === TemplateType.Basic) {
        setBasicTemplateDefaults(ffApp.template.settings as BasicAppSettings);
    }
}

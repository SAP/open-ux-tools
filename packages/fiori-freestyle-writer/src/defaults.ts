import { BasicAppSettings, FioriApp, FreestyleApp, TemplateType } from './types';

/**
 * Set defaults for missing parameters on the given Fiori/UI5 app instance.
 *
 * @param app Fiori application configuration
 */
function setAppDefaults(app: FioriApp): void {
    app.flpAppId = app.flpAppId || `${app.id.replace(/[-_.]/g, '')}-tile`;
}

/**
 * Set defaults for the basic template on the given instance.
 *
 * @param settings settings for the basic template
 */
function setBasicTemplateDefaults(settings: BasicAppSettings): void {
    settings.viewName = settings.viewName || 'View1';
}

/**
 * Set defaults for missing parameters on the given instance of the overal config.
 *
 * @param ffApp full config object used by the generate method
 */
export function setDefaults(ffApp: FreestyleApp<unknown>): void {
    setAppDefaults(ffApp.app);
    if (ffApp.template.type === TemplateType.Basic) {
        setBasicTemplateDefaults(ffApp.template.settings as BasicAppSettings);
    }
}

import readPkgUp from 'read-pkg-up';
import type { BasicAppSettings, FioriApp, FreestyleApp } from './types';
import { TemplateType } from './types';

/**
 * Set defaults for missing parameters on the given Fiori/UI5 app instance.
 *
 * @param app Fiori application configuration
 */
function setAppDefaults(app: FioriApp): void {
    app.baseComponent = app.baseComponent || 'sap/ui/core/UIComponent';
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
 * Adds source template info.
 *
 * @param ffApp full config object used by the generate method
 */
export function setDefaults(ffApp: FreestyleApp<unknown>): void {
    setAppDefaults(ffApp.app);

    // Add template information
    if (!ffApp.app.sourceTemplate?.version || !ffApp.app.sourceTemplate?.id) {
        const packageInfo = readPkgUp.sync({ cwd: __dirname });
        ffApp.app.sourceTemplate = {
            id: `${packageInfo?.packageJson.name}:${ffApp.template.type}`,
            version: packageInfo?.packageJson.version,
            toolsId: ffApp.app.sourceTemplate?.toolsId
        };
    }

    if (ffApp.template.type === TemplateType.Basic) {
        setBasicTemplateDefaults(ffApp.template.settings as BasicAppSettings);
    }
    // All fiori-freestyle apps should use load reuse libs, unless explicitly overridden
    ffApp.appOptions = Object.assign({ loadReuseLibs: true }, ffApp.appOptions);
}

// Specific escaping is required for FLP texts in flpSandbox.html template file
// Escapes '\' with '\\\\' and '"' with '\"' to correctly render inputs in a secure way
export const escapeFLPText = (s: string): string => s.replace(/\\/g, '\\\\').replace(/(")/g, '\\$&');

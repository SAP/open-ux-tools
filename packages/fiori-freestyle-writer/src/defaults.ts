import readPkgUp from 'read-pkg-up';
import type { BasicAppSettings, FioriApp, FreestyleApp } from './types';
import { TemplateType } from './types';
import { compareUI5VersionGte, ui5LtsVersion_1_120 } from './utils';

const defaultVirtualPreviewFile = 'test/flp.html'; // Default virtual preview file name
const defaultIntent = 'app-preview';

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
 * Sets defaults for relevant parameters (`flpAppId`, `startFile`, `localStartFile`,  ) when virtual endpoints are used.
 *
 * @param ffApp - Fiori freestyle application config
 */
export function setVirtualEndpointDefaults(ffApp: FreestyleApp<unknown>): void {
    ffApp.app.flpAppId = defaultIntent;
    ffApp.app.localStartFile = defaultVirtualPreviewFile;
    ffApp.app.startFile = defaultVirtualPreviewFile;
}

/**
 * Set defaults for missing parameters on the given instance of the overall config.
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
    // All fiori-freestyle apps should use load reuse libs for ui5 below 1.120.0 , unless explicitly overridden
    let loadReuseLibs = true;
    if (
        compareUI5VersionGte(ffApp.ui5?.minUI5Version ?? ffApp.ui5?.version ?? '', ui5LtsVersion_1_120) &&
        ffApp.template.type === TemplateType.Basic
    ) {
        loadReuseLibs = false;
    }
    ffApp.appOptions = Object.assign(
        {
            loadReuseLibs: loadReuseLibs
        },
        ffApp.appOptions
    );
    if (ffApp.ui5) {
        const ushell = 'sap.ushell';
        ffApp.ui5.manifestLibs = ffApp.ui5?.manifestLibs ?? ffApp.ui5?.ui5Libs;
        if (Array.isArray(ffApp.ui5?.ui5Libs)) {
            ffApp.ui5.ui5Libs = ffApp.ui5?.ui5Libs?.concat(ushell);
        } else if (typeof ffApp.ui5?.ui5Libs === 'string') {
            ffApp.ui5.ui5Libs = ffApp.ui5?.ui5Libs.includes(ushell)
                ? ffApp.ui5?.ui5Libs
                : ffApp.ui5?.ui5Libs.concat(ushell);
        }
    }
}

// Specific escaping is required for FLP texts in flpSandbox.html template file
// Escapes '\' with '\\\\' and '"' with '\"' to correctly render inputs in a secure way
export const escapeFLPText = (s: string): string => s.replace(/\\/g, '\\\\').replace(/(")/g, '\\$&');

import { join } from 'path';
import type { Editor } from 'mem-fs-editor';
import { render } from 'ejs';
import type { Package } from '@sap-ux/ui5-application-writer';
import { generate as generateUi5Project } from '@sap-ux/ui5-application-writer';
import { generate as addOdataService } from '@sap-ux/odata-service-writer';
import cloneDeep from 'lodash/cloneDeep';
import type { BasicAppSettings } from './types';
import { FreestyleApp, TemplateType } from './types';
import { setDefaults, escapeFLPText } from './defaults';
import { UI5Config } from '@sap-ux/ui5-config';
import { initI18n } from './i18n';
import { getBootstrapResourceUrls, generatePackageScripts } from '@sap-ux/fiori-generator-shared';

/**
 * Generate a UI5 application based on the specified Fiori Freestyle floorplan template.
 *
 * @param basePath - the absolute target path where the application will be generated
 * @param data - configuration to generate the freestyle application
 * @param fs - an optional reference to a mem-fs editor
 * @returns Reference to a mem-fs-editor
 */
async function generate<T>(basePath: string, data: FreestyleApp<T>, fs?: Editor): Promise<Editor> {
    // Load i18n translations asynchronously to ensure proper initialization.
    // This addresses occasional issues where i18n is not initialized in time, causing tests to fail.
    await initI18n();
    // Clone rather than modifying callers refs
    const ffApp = cloneDeep(data);
    // set defaults
    setDefaults(ffApp);
    const isTypeScriptEnabled = ffApp.appOptions?.typescript;
    fs = await generateUi5Project(basePath, ffApp, fs);

    // add new and overwrite files from templates e.g.
    const tmplPath = join(__dirname, '..', 'templates');
    const ignore = [isTypeScriptEnabled ? '**/*.js' : '**/*.ts'];

    // Determine if the project type is 'EDMXBackend'.
    const isEdmxProjectType = ffApp.app.projectType === 'EDMXBackend';
    // Get the resource URLs for the UShell bootstrap and UI bootstrap based on the project type and UI5 framework details
    const { uShellBootstrapResourceUrl, uiBootstrapResourceUrl } = getBootstrapResourceUrls(
        isEdmxProjectType,
        ffApp.ui5?.frameworkUrl,
        ffApp.ui5?.version
    );
    const appConfig = {
        ...ffApp,
        uShellBootstrapResourceUrl,
        uiBootstrapResourceUrl
    };
    fs.copyTpl(
        join(tmplPath, 'common', 'add'),
        basePath,
        {
            ...appConfig,
            escapeFLPText
        },
        undefined,
        {
            globOptions: { ignore, dot: true }
        }
    );
    fs.copyTpl(join(tmplPath, ffApp.template.type, 'add'), basePath, ffApp, undefined, {
        globOptions: { ignore, dot: true }
    });

    if (ffApp.template.type === TemplateType.Basic) {
        const viewName = (ffApp.template.settings as BasicAppSettings).viewName;
        const viewTarget = join(basePath, 'webapp', 'view', `${viewName}.view.xml`);
        fs.copyTpl(join(tmplPath, ffApp.template.type, 'custom/View.xml'), viewTarget, ffApp);
        const ext = isTypeScriptEnabled ? 'ts' : 'js';
        const controllerTarget = join(basePath, `webapp/controller/${viewName}.controller.${ext}`);
        fs.copyTpl(join(tmplPath, ffApp.template.type, `custom/Controller.${ext}`), controllerTarget, ffApp);
    }

    // Add template specific manifest settings
    const manifestPath = join(basePath, 'webapp', 'manifest.json');
    const extRoot = join(__dirname, '..', 'templates', ffApp.template.type, 'extend', 'webapp');
    fs.extendJSON(manifestPath, JSON.parse(render(fs.read(join(extRoot, 'manifest.json')), ffApp, {})));

    // i18n.properties
    fs.append(
        join(basePath, 'webapp', 'i18n', 'i18n.properties'),
        render(fs.read(join(extRoot, 'i18n', 'i18n.properties')), ffApp, {})
    );

    // package.json
    const packagePath = join(basePath, 'package.json');
    // extend package.json with scripts for non-CAP projects
    fs.extendJSON(
        packagePath,
        JSON.parse(render(fs.read(join(tmplPath, 'common', 'extend', 'package.json')), ffApp, {}))
    );

    const packageJson: Package = JSON.parse(fs.read(packagePath));
    if (isEdmxProjectType) {
        // Add scripts for non-CAP applications
        packageJson.scripts = {
            ...packageJson.scripts,
            ...generatePackageScripts({
                localOnly: !!ffApp.service && !ffApp.service?.url,
                addMock: !!ffApp.service?.metadata,
                sapClient: ffApp.service?.client,
                flpAppId: ffApp.app.flpAppId,
                startFile: data?.app?.startFile,
                localStartFile: data?.app?.localStartFile,
                generateIndex: ffApp.appOptions?.generateIndex
            })
        };
    } else {
        // Add deploy-config for CAP applications
        packageJson.scripts = {
            'deploy-config': 'npx -p @sap/ux-ui5-tooling fiori add deploy-config cf'
        };
    }
    fs.writeJSON(packagePath, packageJson);

    // Add service to the project if provided
    if (ffApp.service) {
        await addOdataService(basePath, ffApp.service, fs);
    } else {
        // Add placeholder middleware so allow adding service later
        const ui5LocalConfigPath = join(basePath, 'ui5-local.yaml');
        const ui5LocalConfig = await UI5Config.newInstance(fs.read(ui5LocalConfigPath));
        ui5LocalConfig.addFioriToolsProxydMiddleware({});
        fs.write(ui5LocalConfigPath, ui5LocalConfig.toString());
    }

    return fs;
}

export { generate, FreestyleApp };
export { WorklistSettings, ListDetailSettings, TemplateType, Template, OdataVersion } from './types';

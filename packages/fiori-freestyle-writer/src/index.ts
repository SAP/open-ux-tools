import { join } from 'path';
import { render } from 'ejs';
import { generate as generateUi5Project } from '@sap-ux/ui5-application-writer';
import { generate as addOdataService } from '@sap-ux/odata-service-writer';
import cloneDeep from 'lodash/cloneDeep';
import { FreestyleApp, TemplateType } from './types';
import { setDefaults, escapeFLPText, setVirtualEndpointDefaults } from './defaults';
import { UI5Config } from '@sap-ux/ui5-config';
import { initI18n } from './i18n';
import { getBootstrapResourceUrls, getPackageScripts } from '@sap-ux/fiori-generator-shared';
import { getTemplateVersionPath, processDestinationPath } from './utils';
import { applyCAPUpdates, type CapProjectSettings } from '@sap-ux/cap-config-writer';
import { generateOPATests } from './generateOPATests';
import type { Logger } from '@sap-ux/logger';
import type { Package } from '@sap-ux/ui5-application-writer';
import type { Editor } from 'mem-fs-editor';
import type { BasicAppSettings } from './types';

/**
 * Generate a UI5 application based on the specified Fiori Freestyle floorplan template.
 *
 * @param basePath - the absolute target path where the application will be generated
 * @param data - configuration to generate the freestyle application
 * @param fs - an optional reference to a mem-fs editor
 * @param log - optional logger
 * @returns Reference to a mem-fs-editor
 */
async function generate<T>(basePath: string, data: FreestyleApp<T>, fs?: Editor, log?: Logger): Promise<Editor> {
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
    const ignore = [
        isTypeScriptEnabled ? '**/*.js' : '**/*.ts',
        // if using virtual endpoints for preview, do not add the flpSandbox.html file
        ...(ffApp.appOptions?.useVirtualPreviewEndpoints ? ['**/webapp/test/flpSandbox.html'] : [])
    ];

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
    const templateVersionPath = getTemplateVersionPath(ffApp);

    fs.copyTpl(
        join(tmplPath, 'common', 'add', templateVersionPath),
        basePath,
        {
            ...appConfig,
            escapeFLPText
        },
        undefined,
        {
            globOptions: { ignore, dot: true },
            processDestinationPath: processDestinationPath
        }
    );
    fs.copyTpl(
        join(
            tmplPath,
            ffApp.template.type,
            'add',
            ffApp.template.type === TemplateType.Basic ? templateVersionPath : ''
        ),
        basePath,
        ffApp,
        undefined,
        {
            globOptions: { ignore, dot: true },
            processDestinationPath: processDestinationPath
        }
    );

    if (ffApp.template.type === TemplateType.Basic) {
        const viewName = (ffApp.template.settings as BasicAppSettings).viewName;
        const viewTarget = join(basePath, 'webapp', 'view', `${viewName}.view.xml`);
        fs.copyTpl(
            join(tmplPath, ffApp.template.type, `custom/${templateVersionPath}/View.xml`),
            viewTarget,
            ffApp,
            undefined,
            {
                processDestinationPath: processDestinationPath
            }
        );
        const ext = isTypeScriptEnabled ? 'ts' : 'js';
        const controllerTarget = join(basePath, `webapp/controller/${viewName}.controller.${ext}`);
        fs.copyTpl(
            join(tmplPath, ffApp.template.type, `custom/${templateVersionPath}/Controller.${ext}`),
            controllerTarget,
            ffApp,
            undefined,
            {
                processDestinationPath: processDestinationPath
            }
        );
    }

    // Add template specific manifest settings
    const manifestPath = join(basePath, 'webapp', 'manifest.json');
    const extRoot = join(
        __dirname,
        '..',
        'templates',
        ffApp.template.type,
        'extend',
        ffApp.template.type === TemplateType.Basic ? templateVersionPath : '',
        'webapp'
    );
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

    const addTests = ffApp.appOptions?.addTests;
    const packageJson: Package = JSON.parse(fs.read(packagePath));

    if (ffApp.appOptions?.useVirtualPreviewEndpoints) {
        setVirtualEndpointDefaults(ffApp);
    }

    if (isEdmxProjectType) {
        const addMock = !!ffApp.service?.metadata;
        // Add scripts for non-CAP applications
        packageJson.scripts = {
            ...packageJson.scripts,
            ...getPackageScripts({
                localOnly: !!ffApp.service && !ffApp.service?.url,
                addMock,
                sapClient: ffApp.service?.client,
                flpAppId: ffApp.app.flpAppId,
                startFile: ffApp.app?.startFile,
                localStartFile: ffApp.app?.localStartFile,
                generateIndex: ffApp.appOptions?.generateIndex,
                addTest: addTests && ffApp.template.type === TemplateType.Basic,
                supportVirtualEndpoints: ffApp.appOptions?.useVirtualPreviewEndpoints // no need for search params if virtual endpoints are used
            })
        };
        if (addTests) {
            await generateOPATests(basePath, ffApp, addMock, packageJson, fs, log);
        }
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

    if (ffApp.service?.capService) {
        const cdsUi5PluginInfo = ffApp?.service.capService?.cdsUi5PluginInfo ?? {};
        const settings: CapProjectSettings = {
            appRoot: basePath,
            packageName: ffApp.package.name ?? '',
            appId: ffApp.app.id,
            sapux: ffApp.appOptions?.sapux,
            enableTypescript: ffApp.appOptions?.typescript,
            // Enable CDS UI5 plugin if the minimum CDS version is met and the plugin is not already enabled
            enableCdsUi5Plugin: !!cdsUi5PluginInfo.hasMinCdsVersion && !cdsUi5PluginInfo.hasCdsUi5Plugin,
            enableNPMWorkspaces: !!cdsUi5PluginInfo.hasMinCdsVersion && !cdsUi5PluginInfo.isWorkspaceEnabled
        };
        // apply cap updates when service is cap
        await applyCAPUpdates(fs, ffApp.service.capService, settings);
    }

    return fs;
}

export { generate, FreestyleApp };
export { WorklistSettings, ListDetailSettings, BasicAppSettings, TemplateType, Template, OdataVersion } from './types';

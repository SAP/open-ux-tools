import { join } from 'path';
import type { Editor } from 'mem-fs-editor';
import { render } from 'ejs';
import type { App, Package } from '@sap-ux/ui5-application-writer';
import { generate as generateUi5Project } from '@sap-ux/ui5-application-writer';
import { generate as addOdataService, OdataVersion } from '@sap-ux/odata-service-writer';
import { getPackageJsonTasks } from './packageConfig';
import cloneDeep from 'lodash/cloneDeep';
import { FioriElementsApp } from './types';
import { validateApp, validateRequiredProperties } from './validate';
import { setAppDefaults, setDefaultTemplateSettings } from './data/defaults';
import type { TemplateOptions } from './data/templateAttributes';
import { changesPreviewToVersion, escapeFLPText } from './data/templateAttributes';
import { extendManifestJson } from './data/manifestSettings';
import semVer from 'semver';

/**
 * Generate a UI5 application based on the specified Fiori Elements floorplan template.
 *
 * @param basePath - the absolute target path where the application will be generated
 * @param data - configuration to generate the Fiori elements application
 * @param fs - an optional reference to a mem-fs editor
 * @returns Reference to a mem-fs-editor
 */
async function generate<T>(basePath: string, data: FioriElementsApp<T>, fs?: Editor): Promise<Editor> {
    // Clone rather than modifying callers refs
    const feApp: FioriElementsApp<T> = cloneDeep(data);
    // Ensure input data contains at least the manadatory properties required for app genertation
    validateRequiredProperties(feApp);

    setAppDefaults(feApp);

    fs = await generateUi5Project(basePath, feApp, fs);

    feApp.template.settings = setDefaultTemplateSettings(feApp.template, feApp.service.version);

    // This is done after `generateUi5Project` since defaults are set if values are not provided
    validateApp(feApp);

    await addOdataService(basePath, feApp.service, fs);

    const templateOptions: TemplateOptions = {
        changesPreview: feApp.ui5?.version
            ? semVer.lt(semVer.coerce(feApp.ui5?.version)!, changesPreviewToVersion)
            : false,
        changesLoader: feApp.service.version === OdataVersion.v2
    };

    // Add new files from templates e.g.
    const rootTemplatesPath = join(__dirname, '..', 'templates');
    // Add templates common to all template types
    fs.copyTpl(join(rootTemplatesPath, 'common', 'add', '**/*.*'), basePath, {
        ...feApp,
        templateOptions,
        escapeFLPText
    });

    // Extend common files
    const packagePath = join(basePath, 'package.json');

    // Extend package.json
    fs.extendJSON(
        packagePath,
        JSON.parse(render(fs.read(join(rootTemplatesPath, 'common', 'extend', 'package.json')), feApp))
    );

    const templateVersionPath = join(rootTemplatesPath, `v${feApp.service?.version}`);
    // Copy version specific common templates and version specific, floorplan specific templates
    [join(templateVersionPath, 'common', 'add'), join(templateVersionPath, feApp.template.type, 'add')].forEach(
        (templatePath) => {
            fs!.copyTpl(join(templatePath, '**/*.*'), basePath, feApp, {}, { ignoreNoMatch: true });
        }
    );

    // Update manifest.json with template specific settings
    extendManifestJson(fs, basePath, rootTemplatesPath, feApp);

    const packageJson: Package = JSON.parse(fs.read(packagePath));

    packageJson.scripts = Object.assign(packageJson.scripts, {
        ...getPackageJsonTasks({
            localOnly: !feApp.service?.url,
            addMock: !!feApp.service?.metadata,
            sapClient: feApp.service?.client,
            flpAppId: feApp.app.flpAppId,
            startFile: data?.app?.startFile,
            localStartFile: data?.app?.localStartFile
        })
    });

    fs.writeJSON(packagePath, packageJson);

    return fs;
}

export { generate, FioriElementsApp, App };
export * from './types';

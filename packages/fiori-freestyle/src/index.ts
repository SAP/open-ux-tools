import { join } from 'path';
import { Editor } from 'mem-fs-editor';
import { render } from 'ejs';

import { generate as generateUi5Project } from '@sap/ux-ui5-application-template';
import { generate as addOdataService } from '@sap/ux-odata-service-template';
import { FreestyleApp, WorklistSettings, ListDetailSettings, Template, Package } from '@sap/open-ux-tools-types';
import { TemplateType } from '@sap/open-ux-tools-types'; // This is an enum dont import as type, we lose runtime values
import { UI5Config } from '@sap/ux-ui5-config';
import { getPackageJsonTasks } from '@sap/open-ux-tools-common';
import { getUI5Libs } from './data/ui5Libs';
import cloneDeep from 'lodash/cloneDeep';

/**
 * Generate a UI5 application based on the specified Fiori Freestyle floorplan template.
 *
 * @param basePath - the absolute target path where the applciation will be generated
 * @param data -
 * @param fs - an optional reference to a mem-fs editor
 * @returns Reference to a mem-fs-editor
 */
async function generate<T>(basePath: string, data: FreestyleApp<T>, fs?: Editor): Promise<Editor> {
    // Clone rather than modifyng callers refs
    const ffApp: FreestyleApp<T> = cloneDeep(data) as FreestyleApp<T>;
    // generate base UI5 project
    ffApp.app.baseComponent = ffApp.app.baseComponent || 'sap/ui/core/UIComponent';

    fs = await generateUi5Project(basePath, ffApp, fs);

    // add new and overwrite files from templates e.g.
    const tmplPath = join(__dirname, '..', 'templates');
    // Common files
    fs.copyTpl(join(tmplPath, 'common', 'add', '**/*.*'), basePath, ffApp);

    fs.copyTpl(join(tmplPath, ffApp.template.type, 'add', `**/*.*`), basePath, ffApp);

    // merge content into existing files
    const extRoot = join(__dirname, '..', 'templates', ffApp.template.type, 'extend', 'webapp');

    // manifest.json
    const manifestPath = join(basePath, 'webapp', 'manifest.json');
    fs.extendJSON(manifestPath, JSON.parse(render(fs.read(join(extRoot, 'manifest.json')), ffApp)));

    // i18n.properties
    fs.append(
        join(basePath, 'webapp', 'i18n', 'i18n.properties'),
        render(fs.read(join(extRoot, 'i18n', 'i18n.properties')), ffApp)
    );

    // package.json
    const packagePath = join(basePath, 'package.json');
    fs.extendJSON(packagePath, JSON.parse(render(fs.read(join(tmplPath, 'common', 'extend', 'package.json')), ffApp)));
    const packageJson: Package = JSON.parse(fs.read(packagePath));

    packageJson.scripts = Object.assign(packageJson.scripts, {
        ...getPackageJsonTasks(
            !ffApp.service?.url,
            !!ffApp.service?.metadata,
            ffApp.service?.client,
            ffApp.app.flpAppId,
            data?.app?.startFile,
            data?.app?.localStartFile
        )
    });

    fs.writeJSON(packagePath, packageJson);

    // Add service to the project if provided
    if (ffApp.service) {
        await addOdataService(basePath, ffApp.service, fs);
    }

    // ui5-local.yaml
    const ui5LocalConfigPath = join(basePath, 'ui5-local.yaml');
    const ui5LocalConfig = await UI5Config.newInstance(fs.read(ui5LocalConfigPath));
    if (ffApp?.ui5?.localVersion) {
        ui5LocalConfig.addUI5Framework(ffApp.ui5.localVersion, getUI5Libs(ffApp?.ui5?.ui5Libs), ffApp.ui5.ui5Theme);
    }
    fs.write(ui5LocalConfigPath, ui5LocalConfig.toString());

    return fs;
}

export { generate, FreestyleApp, WorklistSettings, ListDetailSettings, TemplateType, Template };

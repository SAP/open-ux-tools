
import { join } from 'path';
import { Editor } from 'mem-fs-editor';
import { render } from 'ejs';

import { generate as generateUi5Project } from '@sap/ux-ui5-application-template';
import { generate as addOdataService} from '@sap/ux-odata-service-template';
import { FreestyleApp, WorklistSettings, ListDetailSettings, TemplateType } from './data';

/**
 * @param basePath
 * @param data
 * @param fs
 */
async function generate<T>(basePath: string, data: FreestyleApp<T>, fs?: Editor): Promise<Editor>{

    // generate base UI5 project
    data.app.baseComponent = 'sap/ui/core/UIComponent';
    fs = await generateUi5Project(basePath, data, fs);

    // add new and overwrite files from templates e.g. annotations.xml
    const tmpPath = join(__dirname, '..', 'templates');
    fs.copyTpl(join(tmpPath, data.template.type, 'add', '**/*.*'), basePath, data);

    // merge content into existing files
    const extRoot = join(__dirname, '..', 'templates', data.template.type, 'extend', 'webapp');

    // manifest.json
    const manifestPath = join(basePath, 'webapp', 'manifest.json');
    fs.extendJSON(manifestPath, JSON.parse(render(fs.read(join(extRoot, 'manifest.json')), data)));

    // i18n.yaml
    fs.append(join(basePath, 'webapp', 'i18n', 'i18n.properties'), render(fs.read(join(extRoot, 'i18n', 'i18n.properties')), data));
    fs.append(join(basePath, 'webapp', 'i18n', 'i18n_en.properties'), render(fs.read(join(extRoot, 'i18n', 'i18n.properties')), data));

    // package.json
    const packagePath = join(basePath, 'package.json');
    fs.extendJSON(packagePath, fs.readJSON(join(tmpPath, 'common', 'extend', 'package.json')));
    const packageJson = JSON.parse(fs.read(packagePath));
    packageJson.ui5.dependencies.push('@sap/ux-ui5-tooling');
    fs.writeJSON(packagePath, packageJson);
    
    // ui5.yaml
    fs.append(join(basePath, 'ui5.yaml'), render(fs.read(join(tmpPath, 'common', 'extend', 'ui5.yaml')), data));
    
    // add service to the project if provided
    if (data.service) {
        await addOdataService(basePath, data.service, fs);
        const manifest = JSON.parse(fs.read(manifestPath));
        manifest['sap.app'].dataSources[data.service.name!].settings.annotations.push('annotation');
        fs.writeJSON(manifestPath, manifest);
    }

    return fs;
}

export {
    generate,
    FreestyleApp,
    WorklistSettings,
    ListDetailSettings,
    TemplateType
};

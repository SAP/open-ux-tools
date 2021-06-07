
import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create, Editor } from 'mem-fs-editor';
import { render } from 'ejs';

import { OdataService, OdataVersion, enhanceData } from './data';

async function generate<T>(basePath: string, data: OdataService, fs: Editor): Promise<Editor>{

    if (!fs) {
        fs = create(createStorage());
    }
    enhanceData(data);

    // add new and overwrite files from templates
    //const tmpPath = join(__dirname, 'templates', 'add');
    //fs.copyTpl(join(tmpPath, '**/*.*'), basePath, data);

    // merge content into existing files
    const extRoot = join(__dirname, '..', 'templates', 'extend');

    // package.json
    const packagePath = join(basePath, 'package.json');
    fs.extendJSON(packagePath, fs.readJSON(join(extRoot, 'package.json')));
    const packageJson = JSON.parse(fs.read(packagePath));
    packageJson.ui5.dependencies.push('@sap/ux-ui5-fe-mockserver-middleware');
    fs.writeJSON(packagePath, packageJson);

    // manifest.json
    const manifestPath = join(basePath, 'webapp', 'manifest.json');
    fs.extendJSON(manifestPath, JSON.parse(render(fs.read(join(extRoot, `manifest.json`)), data)));

    // ui5.yaml and ui5-local.yaml
    fs.write(join(basePath, 'ui5-local.yaml'), fs.read(join(basePath, 'ui5.yaml')));
    fs.append(join(basePath, 'ui5.yaml'), render(fs.read(join(extRoot, 'ui5.yaml')), data));
    fs.append(join(basePath, 'ui5-local.yaml'), render(fs.read(join(extRoot, 'ui5-local.yaml')), data));

    // create local copy of metadata and annotations
    if (data.metadata) {
        fs.write(join(basePath, 'webapp', 'localService', 'metadata.xml'), data.metadata);
    }
    if (data.annotations?.xml) {
        fs.write(join(basePath, 'webapp', 'localService', `${data.annotations.technicalName}.xml`), data.annotations.xml);
    }

    return fs;
}

export {
    generate,
    OdataVersion,
    OdataService
}

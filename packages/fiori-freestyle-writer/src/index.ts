import { join } from 'path';
import { create as createStore } from 'mem-fs';
import { create as createEditor, Editor } from 'mem-fs-editor';
import { render } from 'ejs';
import { generate as generateUi5Project, Package } from '@sap-ux/ui5-application-writer';
import { generate as addOdataService } from '@sap-ux/odata-service-writer';
import { UI5Config } from '@sap-ux/ui5-config';
import { getPackageJsonTasks } from './packageConfig';
import { getUI5Libs } from './data/ui5Libs';
import cloneDeep from 'lodash/cloneDeep';
import { FreestyleApp } from 'types';

/**
 * Generate a UI5 application based on the specified Fiori Freestyle floorplan template.
 *
 * @param basePath - the absolute target path where the applciation will be generated
 * @param data -
 * @param fs - an optional reference to a mem-fs editor
 * @returns Reference to a mem-fs-editor
 */
async function generate<T>(basePath: string, data: FreestyleApp<T>, fs?: Editor): Promise<Editor> {
    if (!fs) {
        fs = createEditor(createStore());
    }
    const ffApp = mergeWithDefaults(data);
    await generateUi5Project(basePath, ffApp, fs);
    addCommonFiles<T>({ fs, basePath, ffApp });
    addTemplateSpecificFiles<T>({ fs, ffApp, basePath });
    updateManifest<T>({ basePath, fs, ffApp });
    updateI18nProperties<T>({ fs, basePath, ffApp });

    if (ffApp.cap) {
        updateCapSpecificFiles({ basePath, fs });
    } else {
        updatePackageJson<T>(basePath, fs, ffApp, data);
        await addUi5ConfigFiles<T>({ basePath, fs, ffApp });
        if (ffApp.service) {
            await addOdataService(basePath, ffApp.service, fs);
        }
    }

    return fs;
}

const isEmpty = <T>(o: T) => o === undefined || o === null || Object.keys(o).length === 0;

const mergeWithDefaults = <T>(app: FreestyleApp<T>): FreestyleApp<T> => {
    const ffApp = cloneDeep(app);
    ffApp.app.baseComponent = ffApp.app.baseComponent || 'sap/ui/core/UIComponent';
    if (ffApp.cap && isEmpty(ffApp.package.scripts)) {
        ffApp.package.scripts = {};
    }
    return ffApp;
};

const templatePath = (() => {
    // `val` is used to memoize the path
    let val: string | undefined;
    return () => {
        if (!val) {
            val = join(__dirname, '..', 'templates');
        }
        return val;
    };
})();

/**
 * Get the path to the templates that need to be extended for each template type
 */
const extRoot = (() => {
    const cache = new Map<string, string>();
    return (templateType: string) => {
        let p = cache.get(templateType);
        if (!p) {
            p = join(templatePath(), templateType, 'extend', 'webapp');
            cache.set(templateType, p);
        }
        return p;
    };
})();

async function addUi5ConfigFiles<T>({ basePath, fs, ffApp }: { basePath: string; fs: Editor; ffApp: FreestyleApp<T> }) {
    const ui5LocalConfigPath = join(basePath, 'ui5-local.yaml');
    const ui5LocalConfig = await UI5Config.newInstance(fs.read(ui5LocalConfigPath));
    if (ffApp?.ui5?.localVersion) {
        ui5LocalConfig.addUI5Framework(ffApp.ui5.localVersion, getUI5Libs(ffApp?.ui5?.ui5Libs), ffApp.ui5.ui5Theme);
    }
    fs.write(ui5LocalConfigPath, ui5LocalConfig.toString());
}

/**
 * For CAP for refrain from adding files that are not relevant but we _don't_ completely
 * generate the required files.
 *
 * Partial list of files not fully generated/updated:
 * annotations.cds, README.md, ui5.yaml, package.json, index.cds/service.cds, root package.json
 */
function updateCapSpecificFiles<T>({ basePath, fs }: { basePath: string; fs: Editor }): void {
    const deleteIfExists = (filepath: string) => {
        if (fs.exists(filepath)) {
            fs.delete(filepath);
        }
    };

    deleteIfExists(join(basePath, 'ui5-local.yaml'));
    deleteIfExists(join(basePath, '.gitignore'));
}

function updatePackageJson<T>(basePath: string, fs: Editor, ffApp: FreestyleApp<T>, data: FreestyleApp<T>) {
    const packagePath = join(basePath, 'package.json');
    fs.extendJSON(
        packagePath,
        JSON.parse(render(fs.read(join(templatePath(), 'common', 'extend', 'package.json')), ffApp))
    );
    const packageJson: Package = JSON.parse(fs.read(packagePath));

    packageJson.scripts = Object.assign(packageJson.scripts, {
        ...getPackageJsonTasks({
            localOnly: !ffApp.service?.url,
            addMock: !!ffApp.service?.metadata,
            sapClient: ffApp.service?.client,
            flpAppId: ffApp.app.flpAppId,
            startFile: data?.app?.startFile,
            localStartFile: data?.app?.localStartFile
        })
    });

    fs.writeJSON(packagePath, packageJson);
}

function updateI18nProperties<T>({ fs, basePath, ffApp }: { fs: Editor; basePath: string; ffApp: FreestyleApp<T> }) {
    fs.append(
        join(basePath, 'webapp', 'i18n', 'i18n.properties'),
        render(fs.read(join(extRoot(ffApp.template.type), 'i18n', 'i18n.properties')), ffApp)
    );
}

function updateManifest<T>({ basePath, fs, ffApp }: { basePath: string; fs: Editor; ffApp: FreestyleApp<T> }) {
    const manifestPath = join(basePath, 'webapp', 'manifest.json');
    fs.extendJSON(
        manifestPath,
        JSON.parse(render(fs.read(join(extRoot(ffApp.template.type), 'manifest.json')), ffApp))
    );
}

function addTemplateSpecificFiles<T>({
    fs,
    ffApp,
    basePath
}: {
    fs: Editor;
    ffApp: FreestyleApp<T>;
    basePath: string;
}) {
    fs.copyTpl(join(templatePath(), ffApp.template.type, 'add', `**/*.*`), basePath, ffApp);
}

function addCommonFiles<T>({ fs, basePath, ffApp }: { fs: Editor; basePath: string; ffApp: FreestyleApp<T> }) {
    fs.copyTpl(join(templatePath(), 'common', 'add', '**/*.*'), basePath, ffApp);
}

export { generate, FreestyleApp };
export { WorklistSettings, ListDetailSettings, TemplateType, Template, OdataVersion } from './types';

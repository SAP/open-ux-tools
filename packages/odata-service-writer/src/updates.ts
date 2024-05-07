import { render } from 'ejs';
import type { Editor } from 'mem-fs-editor';
import { join } from 'path';
import { t } from './i18n';
import type { OdataService } from './types';
import semVer from 'semver';

/**
 * Internal function that updates the manifest.json based on the given service configuration.
 *
 * @param basePath - the root path of an existing UI5 application
 * @param service - the OData service instance
 * @param fs - the memfs editor instance
 * @param templateRoot - root folder contain the ejs templates
 */
export function updateManifest(basePath: string, service: OdataService, fs: Editor, templateRoot: string) {
    // manifest.json
    const manifestPath = join(basePath, 'webapp', 'manifest.json');
    // Get component app id
    const manifest = fs.readJSON(manifestPath);
    const appProp = 'sap.app';
    const appid = manifest?.[appProp]?.id;
    // Throw if required property is not found manifest.json
    if (!appid) {
        throw new Error(
            t('error.requiredProjectPropertyNotFound', { property: `'${appProp}'.id`, path: manifestPath })
        );
    }

    const manifestJsonExt = fs.read(join(templateRoot, 'extend', `manifest.json`));
    // If the service object includes ejs options, for example 'client' (see: https://ejs.co/#docs),
    // resulting in unexpected behaviour and problems when webpacking. Passing an empty options object prevents this.
    fs.extendJSON(manifestPath, JSON.parse(render(manifestJsonExt, service, {})));
}

/**
 *
 */
export function updateExtendManifest(basePath: string, fs: Editor, templateRoot: string, service: OdataService) {
    const manifestPath = join(basePath, 'webapp', 'manifest.json');
    const testExtendManifestPath = join(templateRoot, 'extend', `manifest.json`);
    const serviceData = {
        name: service.name,
        path: service.path,
        version: service.version,
        model: service.model
    };
    const parsedExtend = JSON.parse(render(fs.read(testExtendManifestPath), { ...serviceData }));
    const manifest = fs.readJSON(manifestPath);

    const ui5Model = parsedExtend?.['sap.ui5']?.models;
    // const appid = parsedExtend?.['sap.app']?.id;

    // starting with UI5 v1.110.0, synchronizationMode should be deleted in the manifest for V4 apps.
    const ui5Version = semVer.coerce(manifest?.['sap.ui5']?.dependencies?.minUI5Version);
    const odataVersion = parsedExtend?.['sap.app']?.dataSources?.[serviceData.name].settings?.odataVersion;
    if (!ui5Version || (semVer.gte(ui5Version, '1.110.0') && odataVersion === '4.0')) {
        delete ui5Model?.[serviceData.model].settings.synchronizationMode;
        // const { synchronizationMode, ...settings } = ui5Model?.settings;
    }
    // const manifestJsonTemplate = fs.read(join(templateRoot, 'extend', `manifest.json`));
    // const renderedManifestJson = render(manifestJsonTemplate, {
    //     ...serviceData
    // });

    // const manifestJsonExt = JSON.parse(renderedManifestJson);
    fs.extendJSON(manifestPath, parsedExtend);
}
/**
 * Update the package.json with the required middlewares.
 *
 * @param path path to the package.json
 * @param fs - the memfs editor instance
 * @param addMockServer true if the mocksever middleware needs to be added as well
 */
export function updatePackageJson(path: string, fs: Editor, addMockServer: boolean) {
    const packageJson = JSON.parse(fs.read(path));
    packageJson.devDependencies = packageJson.devDependencies ?? {};
    if (!hasUI5CliV3(packageJson.devDependencies)) {
        packageJson.ui5 = packageJson.ui5 ?? {};
        packageJson.ui5.dependencies = packageJson.ui5.dependencies ?? [];
        if (!packageJson.ui5.dependencies.includes('@sap/ux-ui5-tooling')) {
            packageJson.ui5.dependencies.push('@sap/ux-ui5-tooling');
        }
        if (
            addMockServer &&
            !packageJson.ui5.dependencies.includes('@sap/ux-ui5-fe-mockserver-middleware') &&
            !packageJson.ui5.dependencies.includes('@sap-ux/ui5-middleware-fe-mockserver')
        ) {
            packageJson.ui5.dependencies.push('@sap-ux/ui5-middleware-fe-mockserver');
        }
    }

    if (!packageJson.devDependencies['@sap/ux-ui5-tooling']) {
        packageJson.devDependencies['@sap/ux-ui5-tooling'] = '1';
    }

    if (addMockServer) {
        if (
            !packageJson.devDependencies['@sap/ux-ui5-fe-mockserver-middleware'] &&
            !packageJson.devDependencies['@sap-ux/ui5-middleware-fe-mockserver']
        ) {
            packageJson.devDependencies['@sap-ux/ui5-middleware-fe-mockserver'] = '2';
        }
    }
    fs.writeJSON(path, packageJson);
}

/**
 * Check if dev dependencies contains @ui5/cli version greater than 2.
 *
 * @param devDependencies dev dependencies from package.json
 * @returns boolean
 */
export function hasUI5CliV3(devDependencies: any): boolean {
    let isV3 = false;
    const ui5CliSemver = semVer.coerce(devDependencies['@ui5/cli']);
    if (ui5CliSemver && semVer.gte(ui5CliSemver, '3.0.0')) {
        isV3 = true;
    }
    return isV3;
}

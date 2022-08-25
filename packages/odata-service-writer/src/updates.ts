import { render } from 'ejs';
import type { Editor } from 'mem-fs-editor';
import { join } from 'path';
import { t } from './i18n';
import type { OdataService } from './types';

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
 * Update the package.json with the required middlewares.
 *
 * @param path path to the package.json
 * @param fs - the memfs editor instance
 * @param addMockServer true if the mocksever middleware needs to be added as well
 */
export function updatePackageJson(path: string, fs: Editor, addMockServer: boolean) {
    const packageJson = JSON.parse(fs.read(path));
    packageJson.devDependencies = packageJson.devDependencies ?? {};
    packageJson.ui5 = packageJson.ui5 ?? {};
    packageJson.ui5.dependencies = packageJson.ui5.dependencies ?? [];

    if (!packageJson.devDependencies['@sap/ux-ui5-tooling']) {
        packageJson.devDependencies['@sap/ux-ui5-tooling'] = '1';
    }
    if (!packageJson.ui5.dependencies.includes('@sap/ux-ui5-tooling')) {
        packageJson.ui5.dependencies.push('@sap/ux-ui5-tooling');
    }

    if (addMockServer) {
        if (
            !packageJson.devDependencies['@sap/ux-ui5-fe-mockserver-middleware'] &&
            !packageJson.devDependencies['@sap-ux/ui5-middleware-fe-mockserver']
        ) {
            packageJson.devDependencies['@sap-ux/ui5-middleware-fe-mockserver'] = '2';
        }
        if (
            !packageJson.ui5.dependencies.includes('@sap/ux-ui5-fe-mockserver-middleware') &&
            !packageJson.ui5.dependencies.includes('@sap-ux/ui5-middleware-fe-mockserver')
        ) {
            packageJson.ui5.dependencies.push('@sap-ux/ui5-middleware-fe-mockserver');
        }
    }
    fs.writeJSON(path, packageJson);
}

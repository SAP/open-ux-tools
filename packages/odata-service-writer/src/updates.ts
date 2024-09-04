import { render } from 'ejs';
import type { Editor } from 'mem-fs-editor';
import path, { join } from 'path';
import { t } from './i18n';
import type { OdataService, CdsAnnotationsInfo, EdmxAnnotationsInfo } from './types';
import semVer from 'semver';
import prettifyXml from 'prettify-xml';
import { getMinimumUI5Version, type Manifest } from '@sap-ux/project-access';

/**
 * Internal function that updates the manifest.json based on the given service configuration.
 *
 * @param manifestPath - the path to the manifest.json
 * @param service - the OData service instance
 * @param fs - the memfs editor instance
 * @param templateRoot - root folder contain the ejs templates
 */
export function updateManifest(manifestPath: string, service: OdataService, fs: Editor, templateRoot: string): void {
    // Get component app id
    const manifest = fs.readJSON(manifestPath) as unknown as Manifest;
    const appProp = 'sap.app';
    const appid = manifest?.[appProp]?.id;
    // Throw if required property is not found manifest.json
    if (!appid) {
        throw new Error(
            t('error.requiredProjectPropertyNotFound', { property: `'${appProp}'.id`, path: manifestPath })
        );
    }

    const manifestJsonExt = fs.read(join(templateRoot, 'extend/manifest.json'));
    const manifestSettings = Object.assign(service, getModelSettings(getMinimumUI5Version(manifest)));
    // If the service object includes ejs options, for example 'client' (see: https://ejs.co/#docs),
    // resulting in unexpected behaviour and problems when webpacking. Passing an empty options object prevents this.
    fs.extendJSON(manifestPath, JSON.parse(render(manifestJsonExt, manifestSettings, {})));
}

/**
 * Updates the cds index or service file with the provided annotations.
 * This function takes an Editor instance and cds annotations
 * and updates either the index file or the service file with the given annotations.
 *
 * @param {Editor} fs - The memfs editor instance
 * @param {CdsAnnotationsInfo} annotations - The cds annotations info.
 * @returns {Promise<void>} A promise that resolves when the cds files have been updated.
 */
async function updateCdsIndexOrServiceFile(fs: Editor, annotations: CdsAnnotationsInfo): Promise<void> {
    const dirPath = join(annotations.projectName, 'annotations');
    const annotationPath = path.normalize(dirPath).split(/[\\/]/g).join(path.posix.sep);
    const annotationConfig = `\nusing from './${annotationPath}';`;
    // get index and service file paths
    const indexFilePath = join(annotations.projectPath, annotations.appPath ?? '', 'index.cds');
    const serviceFilePath = join(annotations.projectPath, annotations.appPath ?? '', 'services.cds');
    // extend index or service file with annotation config
    if (indexFilePath && fs.exists(indexFilePath)) {
        fs.append(indexFilePath, annotationConfig);
    } else if (fs.exists(serviceFilePath)) {
        fs.append(serviceFilePath, annotationConfig);
    } else {
        fs.write(serviceFilePath, annotationConfig);
    }
}

/**
 * Writes annotation XML files.
 *
 * @param {Editor} fs - The memfs editor instance.
 * @param {string} basePath - The base path of the project.
 * @param {OdataService} service - The OData service information.
 */
export function writeAnnotationXmlFiles(fs: Editor, basePath: string, service: OdataService): void {
    // Write annotation xml if annotations are provided and service type is EDMX
    const annotations = service.annotations as EdmxAnnotationsInfo[];
    for (const annotation of annotations) {
        if (annotation.xml) {
            fs.write(
                join(basePath, 'webapp', 'localService', `${annotation.technicalName}.xml`),
                prettifyXml(annotation.xml, { indent: 4 })
            );
        }
    }
}

/**
 * Updates cds files with the provided annotations.
 * This function takes cds annotations and an Editor instance,
 * then updates the relevant cds files with the given annotations.
 *
 * @param {CdsAnnotationsInfo} annotations - The cds annotations info.
 * @param {Editor} fs - The memfs editor instance
 * @returns {Promise<void>} A promise that resolves when the cds files have been updated.
 */
export async function updateCdsFilesWithAnnotations(annotations: CdsAnnotationsInfo, fs: Editor): Promise<void> {
    const annotationCdsPath = join(
        annotations.projectPath,
        annotations.appPath ?? '',
        annotations.projectName,
        'annotations.cds'
    );
    // write into annotations.cds file
    fs.write(annotationCdsPath, annotations.cdsFileContents);
    await updateCdsIndexOrServiceFile(fs, annotations);
}

/**
 * Determines model settings based on the UI5 version.
 *
 * @param minUI5Version - The minimum UI5 version.
 * @returns updated model settings.
 */
function getModelSettings(minUI5Version: string | undefined): { includeSynchronizationMode: boolean } {
    let includeSynchronizationMode = false;
    if (minUI5Version) {
        includeSynchronizationMode = semVer.satisfies(minUI5Version, '<=1.110');
    }
    return { includeSynchronizationMode };
}
/**
 * Update the package.json with the required middlewares.
 *
 * @param path path to the package.json
 * @param fs - the memfs editor instance
 * @param addMockServer true if the mocksever middleware needs to be added as well
 */
export function updatePackageJson(path: string, fs: Editor, addMockServer: boolean): void {
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

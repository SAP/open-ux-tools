import { render } from 'ejs';
import type { Editor } from 'mem-fs-editor';
import { join, normalize, posix, sep } from 'path';
import { t } from './i18n';
import type { OdataService, CdsAnnotationsInfo, EdmxAnnotationsInfo } from './types';
import semVer from 'semver';
import prettifyXml from 'prettify-xml';
import type { Manifest, ManifestNamespace } from '@sap-ux/project-access';
import { DirName, getMinimumUI5Version, getWebappPath, hasUI5CliV3 } from '@sap-ux/project-access';

/**
 * Modifies service in manifest.json and service files in a way that is supported by multiple services.
 * If service files are defined in 'localService' folder then those files are moved to respective service folder and service configuration URI are modified in manifest.json.
 *
 * @param {string} webappPath - the webapp path of an existing UI5 application
 * @param {string} dataSourceKey - dataSource key in manifest.json
 * @param {Manifest} dataSource - dataSource configuration from manifest.json
 * @param {Editor} fs - the memfs editor instance
 */
function updateExistingService(
    webappPath: string,
    dataSourceKey: string,
    dataSource: ManifestNamespace.DataSource,
    fs: Editor
): void {
    const settings = dataSource.settings;
    if (settings) {
        // "localService/metadata.xml"
        const localUri = settings.localUri;
        // -> ["localService", "metadata.xml"]
        const localUriParts = localUri ? localUri.split('/') : undefined;
        if (localUriParts && localUriParts[0] === DirName.LocalService && localUriParts.length === 2) {
            const localFileName = localUriParts[localUriParts.length - 1];
            settings.localUri = `${DirName.LocalService}/${dataSourceKey}/${localFileName}`;
            // move related files to service folder
            const fromFilePath = join(webappPath, localUriParts.join(sep));
            const toFilePath = join(webappPath, DirName.LocalService, dataSourceKey, localFileName);
            if (fs.exists(fromFilePath)) {
                fs.move(fromFilePath, toFilePath);
            }
        }
    }
}

/**
 * Modifies services in manifest.json and services files in a way that is supported by multiple services.
 *
 * @param {string} webappPath - the webapp path of an existing UI5 application
 * @param {Manifest} manifest - the manifest.json of the application
 * @param {Editor} fs - the memfs editor instance
 */
async function updateExistingServices(webappPath: string, manifest: Manifest, fs: Editor): Promise<void> {
    const dataSources = manifest?.['sap.app']?.dataSources;
    for (const dataSourceKey in dataSources) {
        const dataSource = dataSources[dataSourceKey];
        if (dataSource.type === 'OData') {
            updateExistingService(webappPath, dataSourceKey, dataSource, fs);
            const annotations = dataSource.settings?.annotations;
            if (annotations) {
                annotations.forEach((annotationName) => {
                    const annotationDataSource = dataSources[annotationName];
                    updateExistingService(webappPath, dataSourceKey, annotationDataSource, fs);
                });
            }
        }
    }
    fs.writeJSON(join(webappPath, 'manifest.json'), manifest);
}

/**
 * Internal function that updates the manifest.json based on the given service configuration.
 *
 * @param basePath - the root path of an existing UI5 application
 * @param service - the OData service instance
 * @param fs - the memfs editor instance
 * @param templateRoot - root folder contain the ejs templates
 */
export async function updateManifest(
    basePath: string,
    service: OdataService,
    fs: Editor,
    templateRoot: string
): Promise<void> {
    const webappPath = await getWebappPath(basePath, fs);
    const manifestPath = join(webappPath, 'manifest.json');
    // Get component app id
    const manifest = fs.readJSON(manifestPath) as unknown as Manifest;
    const appProp = 'sap.app';
    const appid = manifest?.[appProp]?.id;
    // Check and update existing services
    await updateExistingServices(webappPath, manifest, fs);
    const modifiedManifest = fs.readJSON(manifestPath) as unknown as Manifest;
    // Throw if required property is not found manifest.json
    if (!appid) {
        throw new Error(
            t('error.requiredProjectPropertyNotFound', { property: `'${appProp}'.id`, path: manifestPath })
        );
    }

    const manifestJsonExt = fs.read(join(templateRoot, 'extend', `manifest.json`));
    const manifestSettings = Object.assign(service, getModelSettings(getMinimumUI5Version(modifiedManifest)));
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
    const annotationPath = normalize(dirPath).split(/[\\/]/g).join(posix.sep);
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
 * Writes annotation XML files for EDMX service annotations.
 *
 * @param {Editor} fs - The memfs editor instance.
 * @param {string} basePath - The base path of the project.
 * @param {string} serviceName - Name of The OData service.
 * @param {OdataService} edmxAnnotations - The OData service annotations.
 */
export function writeAnnotationXmlFiles(
    fs: Editor,
    basePath: string,
    serviceName: string,
    edmxAnnotations: EdmxAnnotationsInfo | EdmxAnnotationsInfo[]
): void {
    // Write annotation xml if annotations are provided and service type is EDMX
    if (Array.isArray(edmxAnnotations)) {
        for (const annotationName in edmxAnnotations) {
            const annotation = edmxAnnotations[annotationName];
            if (annotation?.xml) {
                fs.write(
                    join(basePath, 'webapp', 'localService', serviceName, `${annotation.technicalName}.xml`),
                    prettifyXml(annotation.xml, { indent: 4 })
                );
            }
        }
    } else if (edmxAnnotations?.xml) {
        fs.write(
            join(basePath, 'webapp', 'localService', serviceName, `${edmxAnnotations.technicalName}.xml`),
            prettifyXml(edmxAnnotations.xml, { indent: 4 })
        );
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
export async function updateCdsFilesWithAnnotations(
    annotations: CdsAnnotationsInfo | CdsAnnotationsInfo[],
    fs: Editor
): Promise<void> {
    if (Array.isArray(annotations)) {
        for (const annotationName in annotations) {
            const annotation = annotations[annotationName];
            const annotationCdsPath = join(
                annotation.projectPath,
                annotation.appPath ?? '',
                annotation.projectName,
                'annotations.cds'
            );
            // write into annotations.cds file
            if (fs.exists(annotationCdsPath)) {
                fs.append(annotationCdsPath, annotation.cdsFileContents);
            } else {
                fs.write(annotationCdsPath, annotation.cdsFileContents);
            }
            await updateCdsIndexOrServiceFile(fs, annotation);
        }
    } else {
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

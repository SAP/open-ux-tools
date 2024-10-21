import { render } from 'ejs';
import type { Editor } from 'mem-fs-editor';
import { dirname, join, normalize, posix } from 'path';
import { t } from './i18n';
import type { OdataService, CdsAnnotationsInfo, EdmxAnnotationsInfo } from './types';
import semVer from 'semver';
import prettifyXml from 'prettify-xml';
import type { ManifestNamespace } from '@sap-ux/project-access';
import { getMinimumUI5Version, type Manifest, hasUI5CliV3 } from '@sap-ux/project-access';

/**
 * Internal function that deletes EDMX file for dataSource.
 *
 * @param fs - the memfs editor instance
 * @param manifestPath - the root path of an existing UI5 application
 * @param dataSource - name of the OData service instance
 */
async function deleteEDMXFileForDataSource(
    fs: Editor,
    manifestPath: string,
    dataSource: ManifestNamespace.DataSource
): Promise<void> {
    const serviceSettings = dataSource.settings || {};
    if (serviceSettings?.localUri) {
        const localUriPath = join(dirname(manifestPath), serviceSettings?.localUri);
        if (fs.exists(localUriPath)) {
            // delete the local data source file
            await fs.delete(localUriPath);
        }
    }
}

/**
 * Internal function that deletes service from the manifest.json based on the given service name.
 *
 * @param basePath - the root path of an existing UI5 application
 * @param serviceName - name of the OData service instance
 * @param fs - the memfs editor instance
 */
export async function deleteServiceFromManifest(basePath: string, serviceName: string, fs: Editor): Promise<void> {
    const manifestPath = join(basePath, 'webapp', 'manifest.json');
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
    const dataSources = manifest?.[appProp]?.dataSources;
    if (dataSources?.[serviceName]) {
        await deleteEDMXFileForDataSource(fs, manifestPath, dataSources?.[serviceName]);
    }
    const serviceSettings = dataSources?.[serviceName]?.settings;

    // Check for linked backend annotations and delete if found.
    if (serviceSettings?.annotations && serviceSettings.annotations.length > 0) {
        for (const datasourceKey of serviceSettings.annotations) {
            const annotationDatasource = dataSources?.[datasourceKey];
            if (annotationDatasource?.type === 'ODataAnnotation') {
                if (annotationDatasource.uri === annotationDatasource?.settings?.localUri) {
                    // This is localAnnotaton file. Do not delete it.
                } else if (annotationDatasource) {
                    await deleteEDMXFileForDataSource(fs, manifestPath, annotationDatasource);
                    // delete dataSource from manifest
                    delete dataSources?.[datasourceKey];
                }
            }
        }
    }
    // delete dataSource from manifest
    if (dataSources?.[serviceName]) {
        delete dataSources[serviceName];
    }
    const modelsProp = 'sap.ui5';
    // delete models for this service
    const models = manifest?.[modelsProp]?.models;
    if (models) {
        for (const modelKey of Object.keys(models)) {
            const modelObj = models[modelKey];
            if (modelObj?.dataSource === serviceName) {
                delete models[modelKey];
            }
        }
    }
    fs.writeJSON(manifestPath, manifest);
}

/**
 * Internal function that updates the manifest.json based on the given service configuration.
 *
 * @param basePath - the root path of an existing UI5 application
 * @param service - the OData service instance
 * @param fs - the memfs editor instance
 * @param templateRoot - root folder contain the ejs templates
 */
export function updateManifest(basePath: string, service: OdataService, fs: Editor, templateRoot: string): void {
    const manifestPath = join(basePath, 'webapp', 'manifest.json');
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

    const manifestJsonExt = fs.read(join(templateRoot, 'extend', `manifest.json`));
    const manifestSettings = Object.assign(service, getModelSettings(getMinimumUI5Version(manifest)));
    const updatedManifestString = render(manifestJsonExt, manifestSettings, {});
    // If the service object includes ejs options, for example 'client' (see: https://ejs.co/#docs),
    // resulting in unexpected behaviour and problems when webpacking. Passing an empty options object prevents this.
    fs.extendJSON(manifestPath, JSON.parse(updatedManifestString));
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
 * Writes annotation XML files.
 *
 * @param {Editor} fs - The memfs editor instance.
 * @param {string} basePath - The base path of the project.
 * @param {OdataService} service - The OData service information.
 */
export function writeAnnotationXmlFiles(fs: Editor, basePath: string, service: OdataService): void {
    // Write annotation xml if annotations are provided and service type is EDMX
    if (service.annotations && Array.isArray(service.annotations)) {
        const annotations = service.annotations as EdmxAnnotationsInfo[];
        for (const i in annotations) {
            const annotation = annotations[i];
            if (annotation?.xml) {
                fs.write(
                    join(basePath, 'webapp', 'localService', `${annotation.technicalName}.xml`),
                    prettifyXml(annotation.xml, { indent: 4 })
                );
            }
        }
    } else {
        const annotation = service.annotations as EdmxAnnotationsInfo;
        if (annotation?.xml) {
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
export async function updateCdsFilesWithAnnotations(
    annotations: CdsAnnotationsInfo | CdsAnnotationsInfo[],
    fs: Editor
): Promise<void> {
    if (Array.isArray(annotations)) {
        for (const i in annotations) {
            const annotation = annotations[i];
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
function getModelSettings(minUI5Version: string | undefined) {
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

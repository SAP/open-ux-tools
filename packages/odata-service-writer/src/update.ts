import type { Editor } from 'mem-fs-editor';
import { join, normalize, posix } from 'path';
import type { CdsAnnotationsInfo, EdmxOdataService, ProjectPaths } from './types';
import { getWebappPath } from '@sap-ux/project-access';
import { UI5Config } from '@sap-ux/ui5-config';
import { generateMockserverConfig } from '@sap-ux/mockserver-config-writer';
import {
    generateMockserverMiddlewareBasedOnUi5MockYaml,
    removeLocalServiceFiles,
    updateManifest,
    writeAnnotationXmlFiles,
    writeLocalServiceFiles
} from './common';

/**
 * Updates services data in manifest.json and ui5-*.yaml files.
 * Firstly manifest.json is updated.
 * Then using manifest dataSources, mockserver configuration for services and annotations is overwritten.
 * At the end, previous annotation files are removed and new annotation files are generated.
 *
 * @param {string} basePath - the root path of an existing UI5 application
 * @param {ProjectPaths} paths - paths to the project files (package.json, ui5.yaml, ui5-local.yaml and ui5-mock.yaml)
 * @param {string} templateRoot - path to the file templates
 * @param {EdmxOdataService} service - the OData service instance
 * @param {Editor} fs - the memfs editor instance
 */
export async function updateServicesData(
    basePath: string,
    paths: ProjectPaths,
    templateRoot: string,
    service: EdmxOdataService,
    fs: Editor
): Promise<void> {
    let ui5Config: UI5Config | undefined;
    let ui5LocalConfig: UI5Config | undefined;
    await updateManifest(basePath, service, fs, true);
    if (paths.ui5Yaml) {
        ui5Config = await UI5Config.newInstance(fs.read(paths.ui5Yaml));
    }
    if (paths.ui5LocalYaml) {
        ui5LocalConfig = await UI5Config.newInstance(fs.read(paths.ui5LocalYaml));
    }
    // For update, updatable files should already exist
    if (service.metadata && paths.ui5MockYaml) {
        const webappPath = await getWebappPath(basePath, fs);
        if (paths.ui5Yaml && ui5Config) {
            const config = {
                webappPath: webappPath,
                // Since ui5-mock.yaml already exists, set 'skip' to skip package.json file updates
                packageJsonConfig: {
                    skip: true
                },
                // Set 'overwrite' to true to overwrite services data in YAML files
                ui5MockYamlConfig: {
                    overwrite: true
                }
            };
            // Regenerate mockserver middleware for ui5-mock.yaml by overwriting
            await generateMockserverConfig(basePath, config, fs);
            // Update ui5-local.yaml with mockserver middleware from updated ui5-mock.yaml
            await generateMockserverMiddlewareBasedOnUi5MockYaml(fs, paths.ui5Yaml, paths.ui5LocalYaml, ui5LocalConfig);
            if (paths.ui5LocalYaml && ui5LocalConfig) {
                // write ui5 local yaml if service type is not CDS
                fs.write(paths.ui5LocalYaml, ui5LocalConfig.toString());
            }
        }
        // Just in case annotations have changed, remove and write new ones
        await removeLocalServiceFiles(fs, basePath, webappPath, service);
        await writeLocalServiceFiles(fs, basePath, webappPath, templateRoot, service);
    }
    // Write new annotations files
    writeAnnotationXmlFiles(fs, basePath, service.name ?? 'mainService', service.annotations);
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

import { join, sep } from 'node:path';
import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { addServicesData, updateServicesData } from './update';
import { enhanceData, removeAnnotationsFromCDSFiles, updateCdsFilesWithAnnotations } from './data';
import { t } from './i18n';
import type { EdmxOdataService, ProjectPaths, OdataService, CdsAnnotationsInfo } from './types';
import { ServiceType } from './types';

import { deleteServiceData } from './delete';
import { getWebappPath } from '@sap-ux/project-access';
import { updateManifest } from './data/manifest';

/**
 * Ensures the existence of the given files in the provided base path. If a file in the provided list does not exit, an error would be thrown.
 *
 * @param basePath - the root path of an existing UI5 application
 * @param files - list of files that need to exist
 * @param fs - the memfs editor instance
 */
function ensureExists(basePath: string, files: string[], fs: Editor): void {
    files.forEach((path) => {
        if (!fs.exists(join(basePath, path))) {
            throw new Error(t('error.requiredProjectFileNotFound', { path }));
        }
    });
}

/**
 * Try finding a package.json and a ui5.yaml for the given project by looking upwards in the folder hierachy.
 *
 * @param {string} basePath - the root path of an existing UI5 application
 * @param {Editor} [fs] - the memfs editor instance
 * @returns an object with the optional locations of the package.json and ui5.yaml, ui5-local.yaml, ui5-mock.yaml
 */
async function findProjectFiles(basePath: string, fs: Editor): Promise<ProjectPaths> {
    const files: ProjectPaths = {};
    const parts = basePath.split(sep);

    while (parts.length > 0 && (!files.packageJson || !files.ui5Yaml || !files.ui5LocalYaml || !files.ui5MockYaml)) {
        const path = parts.join(sep);
        if (!files.packageJson && fs.exists(join(path, 'package.json'))) {
            files.packageJson = join(path, 'package.json');
        }
        if (!files.ui5Yaml && fs.exists(join(path, 'ui5.yaml'))) {
            files.ui5Yaml = join(path, 'ui5.yaml');
        }
        if (!files.ui5LocalYaml && fs.exists(join(path, 'ui5-local.yaml'))) {
            files.ui5LocalYaml = join(path, 'ui5-local.yaml');
        }
        if (!files.ui5MockYaml && fs.exists(join(path, 'ui5-mock.yaml'))) {
            files.ui5MockYaml = join(path, 'ui5-mock.yaml');
        }
        parts.pop();
    }

    return files;
}

/**
 * Writes the odata service related data and files to an existing UI5 project specified by the base path.
 *
 * @param {string} basePath - the root path of an existing UI5 application
 * @param {OdataService} service - the OData service instance
 * @param {Editor} [fs] - the memfs editor instance
 * @throws {Error} - if required UI5 project files are not found
 * @returns {Promise<Editor>} the updated memfs editor instance
 */
export async function generate(basePath: string, service: OdataService, fs?: Editor): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }
    const paths = await findProjectFiles(basePath, fs);
    const webappPath = await getWebappPath(basePath, fs);
    ensureExists(webappPath, ['manifest.json'], fs);
    await enhanceData(basePath, service, fs);
    // Set isServiceTypeEdmx true if service is EDMX
    const isServiceTypeEdmx = service.type === ServiceType.EDMX;
    // Prepare template folder for manifest and xml updates
    const templateRoot = join(__dirname, '../templates');
    await updateManifest(basePath, service, fs);
    // Dont add backend and mockserver middlewares if service type is CDS
    if (isServiceTypeEdmx) {
        await addServicesData(basePath, paths, templateRoot, service as EdmxOdataService, fs);
    } else if (!isServiceTypeEdmx && service.annotations) {
        // Update cds files with annotations only if service type is CDS and annotations are provided
        await updateCdsFilesWithAnnotations(service.annotations as CdsAnnotationsInfo | CdsAnnotationsInfo[], fs);
    }
    return fs;
}

/**
 * Writes the odata service related file updates to an existing UI5 project specified by the base path.
 *
 * @param {string} basePath - the root path of an existing UI5 application
 * @param {OdataService} service - the OData service instance
 * @param {Editor} [fs] - the memfs editor instance
 * @param {boolean} updateMiddlewares - whether the YAML files for the service (mock-server and fiori-tools-proxy middlewares) should be updated
 * @throws {Error} - if required UI5 project files are not found
 * @returns {Promise<Editor>} the updated memfs editor instance
 */
export async function update(
    basePath: string,
    service: OdataService,
    fs?: Editor,
    updateMiddlewares = true
): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }
    const paths = await findProjectFiles(basePath, fs);
    const webappPath = await getWebappPath(basePath, fs);
    ensureExists(webappPath, ['manifest.json'], fs);
    await enhanceData(basePath, service, fs, true);
    // Set isServiceTypeEdmx true if service is EDMX
    const isServiceTypeEdmx = service.type === ServiceType.EDMX;
    await updateManifest(basePath, service, fs, true);
    // Dont extend/update backend and mockserver middlewares if service type is CDS
    if (isServiceTypeEdmx) {
        await updateServicesData(basePath, paths, service as EdmxOdataService, fs, updateMiddlewares);
    }
    return fs;
}

/**
 * Removes service related data from project files for an existing UI5 project specified by the base path.
 * How the method works:
 * 1. Service and annotation files are removed from manifest.
 * If service type is EDMX:
 * 2. ui5.yaml
 *  - backend data of the service is removed from fiori-tools-proxy middleware
 * 3. ui5-local.yaml
 *  - backend data of the service is removed from fiori-tools-proxy middleware
 *  - service is removed from mockserver middleware
 * 4. ui5-mock.yaml
 *  - service is removed from mockserver middleware
 * If service type is CDS:
 * 2. annotations of the service are removed from CDS files.
 *
 * @param {string} basePath - the root path of an existing UI5 application
 * @param {OdataService} service - the OData service instance
 * @param {string} service.name - name of the OData service instance
 * @param {string} service.path - path of the OData service instance
 * @param {string} service.url - url of the OData service instance
 * @param {ServiceType} service.type - type of the OData service instance
 * @param {OdataService['annotations']} service.annotations - services annotations (EDMX or CDS)
 * @param {Editor} [fs] - the memfs editor instance
 * @throws {Error} - if required UI5 project files are not found
 * @returns {Promise<Editor>} the updated memfs editor instance
 */
export async function remove(basePath: string, service: OdataService, fs?: Editor): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }
    const paths = await findProjectFiles(basePath, fs);
    const isServiceTypeEdmx = service.type === ServiceType.EDMX;
    // Remove service related data and files from manifest, middlewares for EDMX services
    if (isServiceTypeEdmx) {
        await deleteServiceData(basePath, paths, service as EdmxOdataService, fs);
    } else {
        // Remove annotations from CDS files based on annotations info
        await removeAnnotationsFromCDSFiles(service.annotations as CdsAnnotationsInfo | CdsAnnotationsInfo[], fs);
    }
    return fs;
}

export {
    OdataVersion,
    OdataService,
    ServiceType,
    EdmxAnnotationsInfo,
    CdsAnnotationsInfo,
    ExternalServiceCollectionOptions,
    NamespaceAlias
} from './types';
export { getExternalServiceReferences, getAnnotationNamespaces, writeExternalServiceMetadata } from './data';

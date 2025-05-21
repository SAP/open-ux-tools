import type { Editor } from 'mem-fs-editor';
import type { EdmxAnnotationsInfo, OdataService, ProjectPaths } from './types';
import { UI5Config } from '@sap-ux/ui5-config';
import { deleteServiceFromManifest } from './data/manifest';
import { removeRemoteServiceAnnotationXmlFiles } from './data/annotations';

/**
 * Returns all paths of the EDMX service annotations.
 *
 * @param {OdataService} edmxAnnotations - EDMX OData service annotations.
 * @returns {string} annotation paths.
 */
function getEDMXAnnotationPaths(edmxAnnotations: EdmxAnnotationsInfo | EdmxAnnotationsInfo[]): string[] {
    const emdxAnnotationsPaths: string[] = [];
    if (Array.isArray(edmxAnnotations)) {
        edmxAnnotations.forEach((annotation: EdmxAnnotationsInfo) => {
            const technicalName = encodeURIComponent(annotation.technicalName);
            emdxAnnotationsPaths.push(
                `/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='${technicalName}',Version='0001')/$value/` // This is how annotation paths are stored in manifest for ODataAnnotations
            );
        });
    } else {
        const technicalName = encodeURIComponent(edmxAnnotations.technicalName);
        emdxAnnotationsPaths.push(
            `/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='${technicalName}',Version='0001')/$value/`
        );
    }
    return emdxAnnotationsPaths;
}

/**
 * Internal function that deletes service from the manifest.json and ui5-*.yaml files based on the given service data.
 *
 * @param basePath - the root path of an existing UI5 application
 * @param paths - the root path of an existing UI5 application
 * @param service - name of the OData service instance
 * @param fs - the memfs editor instance
 */
export async function deleteServiceData(
    basePath: string,
    paths: ProjectPaths,
    service: OdataService,
    fs: Editor
): Promise<void> {
    deleteServiceFromManifest(basePath, service, fs);
    if (service.path && service.name) {
        let ui5Config: UI5Config | undefined;
        let ui5LocalConfig: UI5Config | undefined;
        let ui5MockConfig: UI5Config | undefined;
        // Delete service data from manifest.json
        if (paths.ui5Yaml) {
            ui5Config = await UI5Config.newInstance(fs.read(paths.ui5Yaml));
            // Delete service backend from fiori-tools-proxy middleware config
            ui5Config.removeBackendFromFioriToolsProxydMiddleware(service.path);
            fs.write(paths.ui5Yaml, ui5Config.toString());
        }
        const serviceAnnotationPaths = getEDMXAnnotationPaths(
            service.annotations as EdmxAnnotationsInfo | EdmxAnnotationsInfo[]
        );
        if (paths.ui5LocalYaml) {
            ui5LocalConfig = await UI5Config.newInstance(fs.read(paths.ui5LocalYaml));
            // Delete service backend from fiori-tools-proxy middleware config
            ui5LocalConfig.removeBackendFromFioriToolsProxydMiddleware(service.path);
            // Delete service from mockserver middleware config
            ui5LocalConfig.removeServiceFromMockServerMiddleware(service.path, serviceAnnotationPaths);
            fs.write(paths.ui5LocalYaml, ui5LocalConfig.toString());
        }
        if (paths.ui5MockYaml) {
            ui5MockConfig = await UI5Config.newInstance(fs.read(paths.ui5MockYaml));
            // Delete service backend from fiori-tools-proxy middleware config
            ui5MockConfig.removeBackendFromFioriToolsProxydMiddleware(service.path);
            // Delete service from mockserver config
            ui5MockConfig.removeServiceFromMockServerMiddleware(service.path, serviceAnnotationPaths);
            fs.write(paths.ui5MockYaml, ui5MockConfig.toString());
        }
        await removeRemoteServiceAnnotationXmlFiles(
            fs,
            basePath,
            service.name,
            service.annotations as EdmxAnnotationsInfo | EdmxAnnotationsInfo[]
        );
    }
}

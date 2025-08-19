import {
    FileName,
    getCapServiceName,
    getMinimumUI5Version,
    getWebappPath,
    readCapServiceMetadataEdmx
} from '@sap-ux/project-access';
import type { ApplicationAccess, Manifest } from '@sap-ux/project-access';
import type { FileData } from '@sap/ux-specification/dist/types/src';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Method returns main service of the application.
 *
 * @param appAccess Application access.
 * @returns main service name
 */
export function getMainService(appAccess: ApplicationAccess): string {
    const appId = appAccess.getAppId();
    const project = appAccess.project;
    let mainService: string | undefined;
    if (appId === undefined) {
        const appIds = Object.keys(project.apps);
        mainService = project.apps[appIds[0]].mainService;
    } else {
        const app = project.apps[appId];
        if (!app) {
            throw new Error('ERROR_INVALID_APP_ID');
        }
        mainService = app.mainService;
    }
    return mainService ?? 'mainService';
}

export async function getServiceName(appAccess: ApplicationAccess): Promise<string> {
    let serviceName = getMainService(appAccess);
    if (appAccess.projectType === 'CAPJava' || appAccess.projectType === 'CAPNodejs') {
        // get CDS service name
        serviceName = await getCapServiceName(appAccess.project.root, appAccess.app?.services?.[serviceName].uri ?? '');
    }
    return serviceName;
}

export async function readAnnotationFiles(appAccess: ApplicationAccess): Promise<FileData[]> {
    const annotationData: FileData[] = [];
    const mainService = getMainService(appAccess);
    if (appAccess.projectType === 'CAPJava' || appAccess.projectType === 'CAPNodejs') {
        const serviceUri = appAccess.app?.services?.[mainService].uri ?? '';
        if (serviceUri) {
            const edmx = await readCapServiceMetadataEdmx(appAccess.root, serviceUri);
            annotationData.push({
                fileContent: edmx,
                dataSourceUri: serviceUri
            });
        }
    } else {
        const service = appAccess.app?.services?.[mainService];
        if (service) {
            if (service.local) {
                const serviceFile = await readFile(service.local);
                annotationData.push({
                    dataSourceUri: service.local,
                    fileContent: serviceFile.toString()
                });
            }
            const { annotations = [] } = service;
            for (const annotation of annotations) {
                if (annotation.local) {
                    const annotationFile = await readFile(annotation.local);
                    annotationData.push({
                        dataSourceUri: annotation.local,
                        fileContent: annotationFile.toString()
                    });
                }
            }
        }
    }
    return annotationData;
}

export async function getManifest(appAccess: ApplicationAccess): Promise<Manifest | undefined> {
    const absoluteWebappPath = await getWebappPath(appAccess.app.appRoot);
    const manifest = join(absoluteWebappPath, FileName.Manifest);
    if (!existsSync(manifest)) {
        return undefined;
    }
    const file = await readFile(manifest);
    return JSON.parse(file.toString());
}

/**
 * Returns the project's ui5version.
 * It reads the vesion from minUI5Version in the manifest.json.
 * If the minUI5Version is not a number, then 'latest' is returned as default value in case of exceptions.
 *
 * @param appAccess - application access object.
 * @returns Resolved UI5 version for passed application.
 */
export async function getUI5Version(appAccess: ApplicationAccess): Promise<string> {
    try {
        let ui5Version: string | undefined;
        const manifest = await getManifest(appAccess);
        if (manifest) {
            ui5Version = getMinimumUI5Version(manifest);
            if (ui5Version !== undefined && isNaN(parseFloat(ui5Version))) {
                ui5Version = 'latest';
            }
        }
        return ui5Version ?? 'latest';
    } catch (error) {
        return 'latest';
    }
}

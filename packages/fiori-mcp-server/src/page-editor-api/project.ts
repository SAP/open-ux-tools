import {
    FileName,
    getCapServiceName,
    getMinimumUI5Version,
    getWebappPath,
    readCapServiceMetadataEdmx
} from '@sap-ux/project-access';
import type { ApplicationAccess, Manifest } from '@sap-ux/project-access';
import type { FileData } from '@sap/ux-specification/dist/types/src';
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { FlexChangeFile } from './types';

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

/**
 * Retrieves the service name for the application.
 *
 * @param appAccess - The application access object
 * @returns A promise that resolves to the service name
 */
export async function getServiceName(appAccess: ApplicationAccess): Promise<string> {
    let serviceName = getMainService(appAccess);
    if (appAccess.projectType === 'CAPJava' || appAccess.projectType === 'CAPNodejs') {
        // get CDS service name
        serviceName = await getCapServiceName(appAccess.project.root, appAccess.app?.services?.[serviceName].uri ?? '');
    }
    return serviceName;
}

/**
 * Reads annotation files for the application.
 *
 * @param appAccess - The application access object
 * @returns A promise that resolves to an array of FileData objects
 */
export async function readAnnotationFiles(appAccess: ApplicationAccess): Promise<FileData[]> {
    const annotationData: FileData[] = [];
    const mainServiceName = getMainService(appAccess);
    const mainService = appAccess.app?.services?.[mainServiceName];
    if (!mainService) {
        return [];
    }
    if (mainService.uri && (appAccess.projectType === 'CAPJava' || appAccess.projectType === 'CAPNodejs')) {
        const serviceUri = mainService?.uri ?? '';
        if (serviceUri) {
            const edmx = await readCapServiceMetadataEdmx(appAccess.root, serviceUri);
            annotationData.push({
                fileContent: edmx,
                dataSourceUri: serviceUri
            });
        }
    } else {
        if (mainService.local) {
            const serviceFile = await readFile(mainService.local);
            annotationData.push({
                dataSourceUri: mainService.local,
                fileContent: serviceFile.toString()
            });
        }
        const { annotations = [] } = mainService;
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
    return annotationData;
}

/**
 * Retrieves the manifest file for the application.
 *
 * @param appAccess - The application access object
 * @returns A promise that resolves to the Manifest object or undefined if not found
 */
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
    const manifest = await getManifest(appAccess);
    let ui5Version = manifest ? getMinimumUI5Version(manifest) : undefined;

    if (ui5Version !== undefined && Number.isNaN(parseFloat(ui5Version))) {
        ui5Version = 'latest';
    }

    return ui5Version ?? 'latest';
}

/**
 * Reads all flex change files from the application's "changes" directory.
 *
 * @param appAccess - application access object.
 * @returns A promise that resolves to an array of flex change files.
 */
export async function readFlexChanges(appAccess: ApplicationAccess): Promise<FlexChangeFile[]> {
    const changes: FlexChangeFile[] = [];
    const changesFolderPath = appAccess.app.changes;
    if (changesFolderPath && existsSync(changesFolderPath)) {
        const files = await readdir(changesFolderPath);
        for (const file of files) {
            const change = await readFile(join(changesFolderPath, file), 'utf8');
            changes.push({
                physicalFileName: file,
                fileContent: change
            });
        }
    }
    return changes;
}

import { ApplicationAccess } from "@sap-ux/project-access";
import {
    FileName,
    getCapServiceName,
    getMinimumUI5Version,
    getWebappPath,
    readCapServiceMetadataEdmx
} from '@sap-ux/project-access';

/**
 * Method returns main service of the application.
 *
 * @param project = project
 * @param appId - application id
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
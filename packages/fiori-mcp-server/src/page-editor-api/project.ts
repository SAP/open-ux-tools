import { FileName, getCapServiceName, getMinimumUI5Version, getWebappPath } from '@sap-ux/project-access';
import type { ApplicationAccess, Manifest, Package } from '@sap-ux/project-access';
import { FlexChangeLayer } from '@sap/ux-specification/dist/types/src';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { logger } from '../utils/logger';

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

    if (ui5Version !== undefined && Number.isNaN(Number.parseFloat(ui5Version))) {
        ui5Version = 'latest';
    }

    return ui5Version ?? 'latest';
}

/**
 * Reads the application's `package.json` file and extracts the `sapuxLayer` property.
 *
 * @param root - the absolute path to the application's root directory.
 * @returns A promise that resolves to the `sapuxLayer` value from `package.json`.
 */
export async function getFlexChangeLayer(root: string): Promise<FlexChangeLayer> {
    let packageJson: Package | undefined;
    const packageJsonPath = join(root, FileName.Package);
    if (existsSync(packageJsonPath)) {
        const file = await readFile(packageJsonPath, { encoding: 'utf-8' });
        try {
            packageJson = JSON.parse(file) as Package;
        } catch (error) {
            logger.error(`Error parsing package.json file ${packageJsonPath} ${error}`);
        }
    }

    return packageJson?.sapuxLayer === 'VENDOR' ? FlexChangeLayer.Vendor : FlexChangeLayer.Customer;
}

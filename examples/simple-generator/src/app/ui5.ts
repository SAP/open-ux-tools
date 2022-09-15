import { request } from 'https';
import localVersionSupport from './version-support.json';

/**
 * Fetch a JSON object from the given url.
 *
 * @param url target url
 * @returns any serialized JSON object
 */
async function getJson<T>(url: string): Promise<T> {
    return new Promise((resolve, reject) => {
        const req = request(url, (response) => {
            let jsonString = '';

            response.on('data', (chunk) => {
                jsonString += chunk;
            });
            response.on('error', () => {
                reject();
            });
            response.on('end', () => {
                resolve(JSON.parse(jsonString));
            });
        });
        req.end();
    });
}

export type UI5Support = {
    version: string;
    support: string;
    lts: boolean;
};

export type UI5SupportVersions = {
    [version: string]: UI5Support;
    latest: UI5Support;
};

let ui5VersionSupport: UI5SupportVersions;

/**
 * Fetch a list of available UI5 version from ui5.sap.com.
 *
 * @returns a promise with a list of available versions.
 */
export async function getUI5Versions(): Promise<UI5SupportVersions> {
    if (!ui5VersionSupport) {
        try {
            ui5VersionSupport = await getJson<UI5SupportVersions>('https://ui5.sap.com/version.json');
        } catch (error) {
            ui5VersionSupport = localVersionSupport;
        }
    }
    return ui5VersionSupport;
}

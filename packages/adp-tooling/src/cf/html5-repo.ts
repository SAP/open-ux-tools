import axios from 'axios';
import AdmZip from 'adm-zip';

import type { ToolsLogger } from '@sap-ux/logger';
import type { Manifest } from '@sap-ux/project-access';

import { createService } from './api';
import { getServiceInstanceKeys } from './utils';
import type { HTML5Content, ServiceKeys, Uaa, AppParams } from '../types';

/**
 * Get the OAuth token from HTML5 repository.
 *
 * @param {Uaa} uaa UAA credentials
 * @returns {Promise<string>} OAuth token
 */
export async function getToken(uaa: Uaa): Promise<string> {
    const auth = Buffer.from(`${uaa.clientid}:${uaa.clientsecret}`);
    const options = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + auth.toString('base64')
        }
    };
    const uri = `${uaa.url}/oauth/token?grant_type=client_credentials`;
    try {
        const response = await axios.get(uri, options);
        return response.data['access_token'];
    } catch (e) {
        // log error: HTML5RepoUtils.ts=>getToken(params)
        throw new Error(`Failed to get the OAuth token from HTML5 repository. Reason: ${e.message}`);
    }
}

/**
 * Download zip from HTML5 repository.
 *
 * @param {string} token html5 reposiotry token
 * @param {string} appHostId appHostId where content is stored
 * @param {string} uri url with parameters
 * @returns {Promise<Buffer>} file buffer content
 */
export async function downloadZip(token: string, appHostId: string, uri: string): Promise<Buffer> {
    try {
        const response = await axios.get(uri, {
            responseType: 'arraybuffer',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token,
                'x-app-host-id': appHostId
            }
        });
        return response.data;
    } catch (e) {
        // log error: HTML5RepoUtils.ts=>downloadZip(params)
        throw new Error(`Failed to download zip from HTML5 repository. Reason: ${e.message}`);
    }
}

/**
 * Get HTML5 repo credentials.
 *
 * @param {string} spaceGuid space guid
 * @param {ToolsLogger} logger logger to log messages
 * @returns {Promise<any>} credentials json object
 */
export async function getHtml5RepoCredentials(spaceGuid: string, logger: ToolsLogger): Promise<ServiceKeys> {
    const INSTANCE_NAME = 'html5-apps-repo-runtime';
    try {
        let serviceKeys = await getServiceInstanceKeys(
            {
                spaceGuids: [spaceGuid],
                planNames: ['app-runtime'],
                names: [INSTANCE_NAME]
            },
            logger
        );
        if (serviceKeys === null || serviceKeys?.credentials === null || serviceKeys?.credentials?.length === 0) {
            await createService(spaceGuid, 'app-runtime', INSTANCE_NAME, logger, ['html5-apps-repo-rt']);
            serviceKeys = await getServiceInstanceKeys({ names: [INSTANCE_NAME] }, logger);
            if (serviceKeys === null || serviceKeys?.credentials === null || serviceKeys?.credentials?.length === 0) {
                throw new Error('Cannot find HTML5 Repo runtime in current space');
            }
        }
        return serviceKeys;
    } catch (e) {
        // log error: HTML5RepoUtils.ts=>getHtml5RepoCredentials(spaceGuid)
        throw new Error(`Failed to get credentials from HTML5 repository for space ${spaceGuid}. Reason: ${e.message}`);
    }
}

/**
 * Download base app manifest.json and xs-app.json from HTML5 repository.
 *
 * @param {string} spaceGuid current space guid
 * @param {AppParams} parameters appName, appVersion, appHostId
 * @param {ToolsLogger} logger logger to log messages
 * @returns {Promise<AdmZip.IZipEntry[]>} manifest.json and xs-app.json
 */
export async function downloadAppContent(
    spaceGuid: string,
    parameters: AppParams,
    logger: ToolsLogger
): Promise<HTML5Content> {
    const { appHostId, appName, appVersion } = parameters;
    const appNameVersion = `${appName}-${appVersion}`;
    try {
        const htmlRepoCredentials = await getHtml5RepoCredentials(spaceGuid, logger);
        if (htmlRepoCredentials?.credentials?.length > 0 && htmlRepoCredentials?.credentials[0]?.uaa) {
            const token = await getToken(htmlRepoCredentials.credentials[0].uaa);
            const uri = `${htmlRepoCredentials.credentials[0].uri}/applications/content/${appNameVersion}?pathSuffixFilter=manifest.json,xs-app.json`;
            const zip = await downloadZip(token, appHostId, uri);
            let admZip;
            try {
                admZip = new AdmZip(zip);
            } catch (e) {
                throw new Error(`Failed to parse zip content from HTML5 repository. Reason: ${e.message}`);
            }
            if (!admZip?.getEntries?.().length) {
                throw new Error('No zip content was parsed from HTML5 repository');
            }
            const zipEntry = admZip.getEntries().find((zipEntry) => zipEntry.entryName === 'manifest.json');
            if (!zipEntry) {
                throw new Error('Failed to find manifest.json in the application content from HTML5 repository');
            }

            try {
                const manifest = JSON.parse(zipEntry.getData().toString('utf8')) as Manifest;
                return {
                    entries: admZip.getEntries(),
                    serviceInstanceGuid: htmlRepoCredentials.serviceInstance.guid,
                    manifest: manifest
                };
            } catch (error) {
                throw new Error('Failed to parse manifest.json.');
            }
        } else {
            throw new Error('No UAA credentials found for HTML5 repository');
        }
    } catch (e) {
        // log error: HTML5RepoUtils.ts=>downloadAppContent(params)
        throw new Error(
            `Failed to download the application content from HTML5 repository for space ${spaceGuid} and app ${appName} (${appHostId}). Reason: ${e.message}`
        );
    }
}

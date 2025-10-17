import axios from 'axios';
import AdmZip from 'adm-zip';

import type { ToolsLogger } from '@sap-ux/logger';
import type { Manifest } from '@sap-ux/project-access';

import { t } from '../../i18n';
import { getServiceNameByTags, getServiceInstanceKeys, createServiceInstance } from '../services/api';
import type { HTML5Content, ServiceKeys, Uaa, CfAppParams } from '../../types';

const HTML5_APPS_REPO_RUNTIME = 'html5-apps-repo-runtime';

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
        throw new Error(t('error.failedToGetAuthKey', { error: e.message }));
    }
}

/**
 * Download zip from HTML5 repository.
 *
 * @param {string} token - HTML5 reposiotry token.
 * @param {string} appHostId - appHostId where content is stored.
 * @param {string} uri - URL with parameters.
 * @returns {Promise<Buffer>} File buffer content.
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
        throw new Error(t('error.failedToDownloadZipFromHtml5Repo', { error: e.message }));
    }
}

/**
 * Get HTML5 repo credentials.
 *
 * @param {string} spaceGuid space guid
 * @param {ToolsLogger} logger logger to log messages
 * @returns {Promise<ServiceKeys>} credentials json object
 */
export async function getHtml5RepoCredentials(spaceGuid: string, logger: ToolsLogger): Promise<ServiceKeys> {
    try {
        let serviceKeys = await getServiceInstanceKeys(
            {
                spaceGuids: [spaceGuid],
                planNames: ['app-runtime'],
                names: [HTML5_APPS_REPO_RUNTIME]
            },
            logger
        );
        if (!serviceKeys?.credentials?.length) {
            const serviceName = await getServiceNameByTags(spaceGuid, ['html5-apps-repo-rt']);
            await createServiceInstance('app-runtime', HTML5_APPS_REPO_RUNTIME, serviceName, {
                logger
            });
            serviceKeys = await getServiceInstanceKeys({ names: [HTML5_APPS_REPO_RUNTIME] }, logger);
            if (!serviceKeys?.credentials?.length) {
                logger.debug(t('error.noUaaCredentialsFoundForHtml5Repo'));
                throw new Error(t('error.cannotFindHtml5RepoRuntime'));
            }
        }
        return serviceKeys;
    } catch (e) {
        throw new Error(t('error.failedToGetCredentialsFromHtml5Repo', { error: e.message }));
    }
}

/**
 * Download base app manifest.json and xs-app.json from HTML5 repository.
 *
 * @param {string} spaceGuid current space guid
 * @param {CfAppParams} parameters appName, appVersion, appHostId
 * @param {ToolsLogger} logger logger to log messages
 * @returns {Promise<AdmZip.IZipEntry[]>} manifest.json and xs-app.json
 */
export async function downloadAppContent(
    spaceGuid: string,
    parameters: CfAppParams,
    logger: ToolsLogger
): Promise<HTML5Content> {
    const { appHostId, appName, appVersion } = parameters;
    const appNameVersion = `${appName}-${appVersion}`;
    try {
        const htmlRepoCredentials = await getHtml5RepoCredentials(spaceGuid, logger);

        const token = await getToken(htmlRepoCredentials?.credentials[0]?.uaa);
        const uri = `${htmlRepoCredentials?.credentials[0]?.uri}/applications/content/${appNameVersion}?pathSuffixFilter=manifest.json,xs-app.json`;
        const zip = await downloadZip(token, appHostId, uri);

        let admZip;
        try {
            admZip = new AdmZip(zip);
        } catch (e) {
            throw new Error(t('error.failedToParseZipContent', { error: e.message }));
        }
        if (!admZip?.getEntries?.().length) {
            throw new Error(t('error.noZipContentParsed'));
        }
        const zipEntry = admZip.getEntries().find((zipEntry) => zipEntry.entryName === 'manifest.json');
        if (!zipEntry) {
            throw new Error(t('error.failedToFindManifestJsonInHtml5Repo'));
        }

        try {
            const manifest = JSON.parse(zipEntry.getData().toString('utf8')) as Manifest;
            return {
                entries: admZip.getEntries(),
                serviceInstanceGuid: htmlRepoCredentials.serviceInstance.guid,
                manifest: manifest
            };
        } catch (e) {
            throw new Error(t('error.failedToParseManifestJson', { error: e.message }));
        }
    } catch (e) {
        logger.error(e);
        throw new Error(t('error.failedToDownloadAppContent', { spaceGuid, appName, appHostId, error: e.message }));
    }
}

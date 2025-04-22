import type { UI5Version } from '../types';
import { UI5_VERSIONS_CDN_URL, UI5_VERSIONS_NEO_CDN_URL, LATEST_VERSION } from '../base/constants';

/**
 * Fetches public UI5 version data from the SAP CDN.
 *
 * @returns {Promise<UI5Version>} A promise that resolves to the UI5 version data object.
 * @throws Will throw an error if the fetch fails.
 */
export async function fetchPublicVersions(): Promise<UI5Version> {
    const response = await fetch(UI5_VERSIONS_CDN_URL);
    if (!response.ok) {
        throw new Error(`Failed to fetch public UI5 versions. Status: ${response.status}`);
    }
    return response.json();
}

/**
 * Fetches internal UI5 versions from the Neo CDN and maps them to formatted version strings.
 *
 * @param {string} latestVersion - The latest public UI5 version.
 * @returns {Promise<string[]>} A promise that resolves to an array of formatted internal version strings.
 */
export async function fetchInternalVersions(latestVersion: string): Promise<string[]> {
    const response = await fetch(UI5_VERSIONS_NEO_CDN_URL);
    const data = await response.json();

    return data?.routes?.map((route: { target: { version: string } }) => {
        return route.target.version === latestVersion
            ? `${route.target.version} ${LATEST_VERSION}`
            : route.target.version;
    });
}

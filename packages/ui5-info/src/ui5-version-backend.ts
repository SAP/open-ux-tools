import axios from 'axios';
import https from 'https';

/**
 * Query the UI5 version used by backend system.
 *
 * @param sapSystemHost - Host URL of sap system retrieves from service inquiry step
 * @param rejectUnauthorized - Set to true to reject querying hosts with self-signed https certificates. Default to false.
 * @returns - Semantic version of UI5 version. Possibly undefined.
 */
export async function getSapSystemUI5Version(
    sapSystemHost: string,
    rejectUnauthorized = false
): Promise<string | undefined> {
    if (!sapSystemHost) {
        return undefined;
    }
    const url = new URL('/sap/public/bc/ui5_ui5/bootstrap_info.json', sapSystemHost).toString();
    let version;
    try {
        const response = await axios.get(url, {
            httpsAgent: new https.Agent({
                rejectUnauthorized
            })
        });
        if (response.status === 200) {
            const versionInfo = response.data as {
                UI5ResourceURL: string;
                Version: string;
            };
            version = versionInfo.Version;
        }
    } catch {
        // Best effort attempt to retrieve UI5 version number from backend system.
        // No need to handle the error and version is undefined if not possible to
        // query UI5 version.
    }
    return version;
}

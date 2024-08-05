import type { SingleVersionInfo } from '../../types/global';
import VersionInfo from 'sap/ui/VersionInfo';
import Log from 'sap/base/Log';

/**
 * Retrieve the UI5 version from sap.ui.core library
 */
export async function getUi5Version() {
    let version = ((await VersionInfo.load({ library: 'sap.ui.core' })) as SingleVersionInfo)?.version;
    if (!version) {
        Log.error('Could not get UI5 version of application. Using 1.121.0 as fallback.');
        version = '1.121.0';
    }
    return version;
}

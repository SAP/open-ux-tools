import type {SingleVersionInfo} from '../../types/global';
import VersionInfo from 'sap/ui/VersionInfo';

/**
 * Retrieve the UI5 version from sap.ui.core library
 */
export async function getUi5Version() {
    const version = (await VersionInfo.load({library:'sap.ui.core'}) as SingleVersionInfo)?.version;
    if (!version) {
        throw new Error('Could not get UI5 version');
    }
    return version;
}
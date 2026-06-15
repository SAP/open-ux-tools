import type Component from 'sap/ui/core/Component';
import FlexChange from 'sap/ui/fl/Change';
import {
    getAddXMLAdditionalInfo,
    type AddXMLAdditionalInfo,
    type AddXMLChangeContent
} from '../cpe/additional-change-info/add-xml-additional-info.js';
import { FlexChange as Change } from '../flp/common.js';
import { getChangeDefinition } from './changes.js';

export type AdditionalChangeInfo = AddXMLAdditionalInfo | undefined;
type FlexXMLChange = FlexChange<AddXMLChangeContent>;

const additionalChangeInfoMap = new Map<string, AdditionalChangeInfo>();

/**
 * This function is used to set additional change information for a given change.
 *
 * @param changes - An array of change objects, for which additional information is to be set.
 * @param appComponent - The app component (optional), used to resolve controls in projects with local IDs.
 */
export function setAdditionalChangeInfo(changes: FlexXMLChange[], appComponent?: Component): void {
    changes.forEach((change) => {
        const { fileName } = getChangeDefinition(change);
        const changeInfo = getAddXMLAdditionalInfo(change, appComponent);

        if (!changeInfo) {
            return;
        }

        if (additionalChangeInfoMap.has(fileName)) {
            const storedChangeInfo = additionalChangeInfoMap.get(fileName);
            additionalChangeInfoMap.set(fileName, {
                ...changeInfo,
                ...storedChangeInfo
            });
        } else {
            additionalChangeInfoMap.set(fileName, changeInfo);
        }
    });
}

export function setAdditionalChangeInfoForChangeFile(
    fileName: string,
    additionalChangeInfo: AdditionalChangeInfo
): void {
    additionalChangeInfoMap.set(fileName, additionalChangeInfo);
}

/**
 * Retrieves additional change information for a given change.
 *
 * @param change - The change object containing details about a file modification.
 * @returns The additional change information associated with the file name of the change,
 *          or `undefined` if no additional information is available.
 */
export function getAdditionalChangeInfo(change: Change): AdditionalChangeInfo {
    return additionalChangeInfoMap.get(change.fileName);
}

/**
 * Should only be used in tests.
 */
export function clearAdditionalChangeInfo(): void {
    additionalChangeInfoMap.clear();
}

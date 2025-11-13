import FlexChange from 'sap/ui/fl/Change';
import {
    getAddXMLAdditionalInfo,
    type AddXMLAdditionalInfo,
    type AddXMLChangeContent
} from '../cpe/additional-change-info/add-xml-additional-info';
import { FlexChange as Change } from '../flp/common';

export type AdditionalChangeInfo = AddXMLAdditionalInfo | undefined;

const additionalChangeInfoMap = new Map<string, AdditionalChangeInfo>();

/**
 * This function is used to set additional change information for a given change.
 *
 * @param change - The change object for which additional information is to be set.
 */
export function setAdditionalChangeInfo(change: FlexChange<AddXMLChangeContent> | undefined): void {
    if (!change) {
        return;
    }

    let additionalChangeInfo;
    const key = change.getDefinition().fileName;
    if (change?.getChangeType?.() === 'addXML') {
        additionalChangeInfo = getAddXMLAdditionalInfo(change);
    }

    if (additionalChangeInfo) {
        const existingInfo = additionalChangeInfoMap.get(key);
        if (existingInfo) {
            // Merge new info with existing info, keeping existing values and only adding new ones
            const mergedInfo = {
                ...additionalChangeInfo,
                ...existingInfo
            };
            additionalChangeInfoMap.set(key, mergedInfo);
        } else {
            // No existing info, set the new info
            additionalChangeInfoMap.set(key, additionalChangeInfo);
        }
    }
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

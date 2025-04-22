import FlexChange from 'sap/ui/fl/Change';
import {
    getAddXMLAdditionalInfo,
    type AddXMLAdditionalInfo,
    type AddXMLChangeContent
} from '../cpe/additional-change-info/add-xml-additional-info';
import { FlexChange as Change } from '../flp/common';

const additionalChangeInfoMap = new Map<string, AddXMLAdditionalInfo>();

export type AdditionalChangeInfo = AddXMLAdditionalInfo | undefined

/**
* This function is used to set additional change information for a given change.
* 
* @param {FlexChange<AddXMLChangeContent>} change - The change object for which additional information is to be set.
*/
export function setAdditionalChangeInfo(change: FlexChange<AddXMLChangeContent> | undefined): void {
    if (!change) {
        return;
    }

    let additionalChangeInfo;
    if(change?.getChangeType?.() === 'addXML') {
        additionalChangeInfo = getAddXMLAdditionalInfo(change);
    }

    if (additionalChangeInfo) {
        additionalChangeInfoMap.set(change.getDefinition().fileName, additionalChangeInfo);
    }
}

/**
 * Retrieves additional change information for a given change.
 *
 * @param {Change}change - The change object containing details about a file modification.
 * @returns The additional change information associated with the file name of the change,
 *          or `undefined` if no additional information is available.
 */
export function getAdditionalChangeInfo(change: Change): AdditionalChangeInfo {
    return additionalChangeInfoMap.get(change.fileName);              
}

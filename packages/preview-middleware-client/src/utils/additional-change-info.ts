import type Component from 'sap/ui/core/Component';
import FlexChange from 'sap/ui/fl/Change';
import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import {
    getAddXMLAdditionalInfo,
    type AddXMLAdditionalInfo,
    type AddXMLChangeContent
} from '../cpe/additional-change-info/add-xml-additional-info.js';
import { ADD_XML_CHANGE } from '../cpe/changes/generic-change';
import { FlexChange as Change } from '../flp/common.js';

export type AdditionalChangeInfo = AddXMLAdditionalInfo | undefined;
type FlexXMLChange = FlexChange<AddXMLChangeContent>;
type FlexBaseChange = Omit<FlexChange<unknown>, 'setContent'>;

const additionalChangeInfoMap = new Map<string, AdditionalChangeInfo>();

/**
 * This function is used to set additional change information for a given change.
 *
 * @param changes - An array of change objects, for which additional information is to be set.
 * @param appComponent - The app component (optional), used to resolve controls in projects with local IDs.
 */
export function setAdditionalChangeInfo(changes: FlexXMLChange[], appComponent?: Component): void {
    changes.reduce((changeInfoByFileNameMap, change) => {
        const { fileName } = change.convertToFileContent();
        const changeInfo = getAddXMLAdditionalInfo(change, appComponent);

        if (!changeInfo) {
            return changeInfoByFileNameMap;
        }

        if (changeInfoByFileNameMap.has(fileName)) {
            const storedChangeInfo = changeInfoByFileNameMap.get(fileName);
            changeInfoByFileNameMap.set(fileName, {
                ...changeInfo,
                ...storedChangeInfo
            });
        } else {
            changeInfoByFileNameMap.set(fileName, changeInfo);
        }

        return changeInfoByFileNameMap;
    }, additionalChangeInfoMap);
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

/**
 * Extracts the list of changes from a flex command.
 *
 * @param command - The flex command from which to extract changes.
 * @returns An array of flex changes associated with the command, or an empty array if no changes are available.
 */
export function getFlexChangeList(command?: FlexCommand): FlexBaseChange[] {
    const changes = command?.getPreparedChange?.();
    if (!changes) {
        return [];
    }
    return Array.isArray(changes) ? changes : [changes];
}

/**
 * Extracts the list of XML changes from a flex command, filtering only changes of type 'addXML'.
 *
 * @param command - The flex command from which to extract XML changes.
 * @returns An array of flex XML changes associated with the command.
 */
export function getFlexXMLChangeList(command?: FlexCommand): FlexXMLChange[] {
    return getFlexChangeList(command).filter(
        (change): change is FlexXMLChange => change.getChangeType?.() === ADD_XML_CHANGE
    );
}

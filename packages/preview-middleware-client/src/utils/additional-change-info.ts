import type Component from 'sap/ui/core/Component';
import FlexChange, { ChangeDefinition } from 'sap/ui/fl/Change';
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
interface FlexLegacyBaseChange {
    getDefinition: () => ChangeDefinition;
}

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

/**
 * Retrieves the change definition from a flex change object, supporting both modern and legacy UI5 APIs.
 *
 * In UI5 2.x, the change base class is a FlexObject exposing `convertToFileContent()`.
 * In older UI5 versions (e.g. 1.96.x), the base class is `Change` which uses the now-deprecated
 * `getDefinition()` method and lacks `convertToFileContent`. This function falls back to
 * `getDefinition()` for backward compatibility with those older versions.
 *
 * @param change - The flex change object (modern FlexObject or legacy Change instance).
 * @returns The change definition.
 * @throws Error if the change object supports neither API.
 */
export function getChangeDefinition(change: FlexBaseChange | FlexLegacyBaseChange): ChangeDefinition {
    if ('convertToFileContent' in change) {
        return change.convertToFileContent();
    }

    if ('getDefinition' in change) {
        return change.getDefinition();
    }

    throw new Error('Unsupported change object');
}

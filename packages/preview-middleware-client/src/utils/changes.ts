import FlexChange, { ChangeDefinition } from 'sap/ui/fl/Change';
import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import { AddXMLChangeContent } from '../cpe/additional-change-info/add-xml-additional-info.js';
import { ADD_XML_CHANGE } from '../cpe/changes/generic-change';

type FlexXMLChange = FlexChange<AddXMLChangeContent>;
type FlexBaseChange = Omit<FlexChange<unknown>, 'setContent'>;
interface FlexLegacyBaseChange {
    getDefinition: () => ChangeDefinition;
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
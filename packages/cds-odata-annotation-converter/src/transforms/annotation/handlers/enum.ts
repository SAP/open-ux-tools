import type { Collection, Enum } from '@sap-ux/cds-annotation-parser';
import { copyRange, ENUM_TYPE, nodeRange } from '@sap-ux/cds-annotation-parser';

import type { Element, Range } from '@sap-ux/odata-annotation-core-types';
import { createElementNode, createTextNode, Edm } from '@sap-ux/odata-annotation-core-types';

import type { NodeHandler } from '../handler';
import type { VisitorState } from '../visitor-state';

/**
 * Delimiter between two enum values, used for flags
 */
export const ENUM_VALUE_DELIMITER = ' ';
/**
 * Delimiter between enum type and member name
 */
export const ENUM_MEMBER_DELIMITER = '/';

export const toEnumValue = (type: string, memberName: string): string => [type, memberName].join(ENUM_MEMBER_DELIMITER);
export const enumHandler: NodeHandler<Enum> = {
    type: ENUM_TYPE,
    convert(state: VisitorState, node: Enum): Element | undefined {
        if (!state.context.valueType) {
            return;
        }

        const enumValue = toEnumValue(state.context.valueType, node.path.value);
        const textNode = createTextNode(enumValue, nodeRange(node, false));
        const enumFragmentRange = nodeRange(node, true);
        if (enumFragmentRange) {
            textNode.fragmentRanges = [enumFragmentRange];
        }

        return createElementNode({
            name: Edm.EnumMember,
            range: nodeRange(node, true),
            contentRange: nodeRange(node, false),
            content: [textNode]
        });
    }
};

/**
 * Converts collection items representing flags (enums) into an EnumMember element.
 *
 * @param state - The visitor state.
 * @param node - The collection node containing enum items.
 * @param valueType - The type of the enum values.
 * @returns An EnumMember element representing the converted flags.
 */
export function convertFlags(state: VisitorState, node: Collection, valueType: string): Element {
    // Alternative is to provide conversion diagnostics
    const enums = node.items.filter((item): item is Enum => item.type === ENUM_TYPE);
    const segments: string[] = [];
    const fragmentRanges: Range[] = [];
    let invalidRanges = false;
    for (const enumNode of enums) {
        const enumValue = toEnumValue(valueType, enumNode.path.value);
        segments.push(enumValue);
        if (enumNode.range) {
            fragmentRanges.push(copyRange(enumNode.range));
        } else {
            invalidRanges = true;
        }
    }

    const value = segments.join(ENUM_VALUE_DELIMITER);
    return createElementNode({
        name: Edm.EnumMember,
        range: nodeRange(node, true),
        contentRange: nodeRange(node, false),
        content: [createTextNode(value, nodeRange(node, false), invalidRanges ? undefined : fragmentRanges)]
    });
}

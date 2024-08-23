import type { NumberLiteral } from '@sap-ux/cds-annotation-parser';
import { NUMBER_LITERAL_TYPE, nodeRange } from '@sap-ux/cds-annotation-parser';
import type { Element } from '@sap-ux/odata-annotation-core-types';
import { createElementNode, createTextNode, Edm } from '@sap-ux/odata-annotation-core-types';

import type { NodeHandler } from '../handler';
import type { VisitorState } from '../visitor-state';

export const numberHandler: NodeHandler<NumberLiteral> = {
    type: NUMBER_LITERAL_TYPE,
    convert(state: VisitorState, node: NumberLiteral): Element | undefined {
        const elementName = getNumberType(state.context.valueType, node.value);
        return createElementNode({
            name: elementName,
            range: nodeRange(node, true),
            contentRange: nodeRange(node, true),
            content: [createTextNode(node.value.toString(), nodeRange(node, false))]
        });
    }
};

/**
 * Determines the corresponding Edm type for the given type name and value.
 *
 * @param typeName - The type name to be considered.
 * @param value - The value for which the Edm type is determined.
 * @returns The corresponding Edm type.
 */
export function getNumberType(typeName: string | undefined, value: number | string): string {
    if (typeName === 'Edm.Decimal') {
        return Edm.Decimal;
    }
    if (typeName === 'Edm.Double' || typeName === 'Edm.Single') {
        return Edm.Float;
    }
    if (typeName === 'Edm.Int64') {
        return Edm.Int;
    }
    if (typeof value === 'number') {
        if (typeName === 'Edm.String') {
            return Edm.String;
        }
        if (Number.isInteger(value)) {
            return Edm.Int;
        }
        // cds has no number literals which can only be represented as float value, see url://pages.github.tools.sap/cap/docs/cds/types
        return Edm.Decimal;
    }
    return Edm.String;
}

import type { QuotedLiteral, QuotedLiteralKind } from '@sap-ux/cds-annotation-parser';
import { QUOTED_LITERAL_TYPE, nodeRange } from '@sap-ux/cds-annotation-parser';
import type { Element } from '@sap-ux/odata-annotation-core-types';
import { createElementNode, Edm } from '@sap-ux/odata-annotation-core-types';

import type { NodeHandler } from '../handler';
import type { VisitorState } from '../visitor-state';

export const quotedLiteralHandler: NodeHandler<QuotedLiteral> = {
    type: QUOTED_LITERAL_TYPE,
    convert(state: VisitorState, node: QuotedLiteral): Element | undefined {
        const element: Element = createElementNode({
            name: getElementNameForQuotedLiteral(node.kind),
            nameRange: nodeRange(node, false),
            range: nodeRange(node, true)
        });

        return element;
    }
};

/**
 *
 * @param kind quoted string.
 * @returns check case and return Edm (Time of Day, date, dateOffset or binary).
 */
function getElementNameForQuotedLiteral(kind: QuotedLiteralKind): Edm {
    switch (kind) {
        case 'time':
            return Edm.TimeOfDay;
        case 'date':
            return Edm.Date;
        case 'timestamp':
            return Edm.DateTimeOffset;
        case 'binary':
            return Edm.Binary;
        default:
            // Use 'assertNever' to handle exhaustiveness check
            return assertNever(kind);
    }
}

/**
 * Throws an error indicating that a value should never be reached.
 *
 * @param value - The value that should never be reached.
 */
function assertNever(value: never): never {
    throw new Error(`Unexpected value: ${value}`);
}

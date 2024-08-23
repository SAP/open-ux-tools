import type { BooleanLiteral } from '@sap-ux/cds-annotation-parser';
import { BOOLEAN_TYPE, nodeRange } from '@sap-ux/cds-annotation-parser';
import type { Element } from '@sap-ux/odata-annotation-core-types';
import { createElementNode, createTextNode, Edm } from '@sap-ux/odata-annotation-core-types';

import type { NodeHandler } from '../handler';
import type { VisitorState } from '../visitor-state';

export const booleanHandler: NodeHandler<BooleanLiteral> = {
    type: BOOLEAN_TYPE,
    convert(state: VisitorState, node: BooleanLiteral): Element | undefined {
        let text = '';
        if (node.value === true) {
            text = 'true';
        } else if (node.value === false) {
            text = 'false';
        }
        const element: Element = createElementNode({
            name: Edm.Bool,
            range: nodeRange(node, true),
            contentRange: nodeRange(node, false),
            content: [createTextNode(text, nodeRange(node, false))]
        });
        return element;
    }
};

import type { Token } from '@sap-ux/cds-annotation-parser';
import { TOKEN_TYPE, nodeRange } from '@sap-ux/cds-annotation-parser';
import type { Element } from '@sap-ux/odata-annotation-core-types';
import { createElementNode, Edm } from '@sap-ux/odata-annotation-core-types';

import type { NodeHandler } from '../handler';
import type { VisitorState } from '../visitor-state';

export const tokenHandler: NodeHandler<Token> = {
    type: TOKEN_TYPE,
    convert(state: VisitorState, node: Token): Element | undefined {
        if (node.value === 'null') {
            return createElementNode({
                name: Edm.Null,
                nameRange: nodeRange(node, false),
                range: nodeRange(node, true)
            });
        }
        return undefined;
    }
};

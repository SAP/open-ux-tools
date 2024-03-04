import type { AnnotationNode, Collection } from '@sap-ux/cds-annotation-parser';
import { COLLECTION_TYPE, nodeRange } from '@sap-ux/cds-annotation-parser';

import type { Element } from '@sap-ux/odata-annotation-core-types';
import { createElementNode, Edm } from '@sap-ux/odata-annotation-core-types';

import { ENUM_TYPE_KIND } from '@sap-ux/odata-vocabularies';

import type { NodeHandler } from '../handler';
import type { VisitorState } from '../visitor-state';
import { convertFlags } from './enum';

export const collectionHandler: NodeHandler<Collection> = {
    type: COLLECTION_TYPE,
    getChildren,
    convert(state: VisitorState, node: Collection): Element | undefined {
        const valueType = state.context.valueType;
        const vocabularyType = valueType ? state.vocabularyService.getType(valueType) : undefined;

        state.pushContext({ ...state.context, isCollection: false });
        if (valueType && vocabularyType?.kind === ENUM_TYPE_KIND) {
            return convertFlags(state, node, valueType);
        }
        const element: Element = createElementNode({
            name: Edm.Collection,
            range: nodeRange(node, true),
            contentRange: nodeRange(node, false)
        });

        return element;
    }
};

/**
 * Gets the children of a collection node based on the provided visitor state and collection node.
 *
 * @param state - The visitor state.
 * @param node - The collection node.
 * @returns The array of children nodes.
 */
function getChildren(state: VisitorState, node: Collection): AnnotationNode[] {
    const valueType = state.context.valueType;
    const vocabularyType = valueType ? state.vocabularyService.getType(valueType) : undefined;
    if (vocabularyType?.kind === ENUM_TYPE_KIND) {
        return [];
    }
    return node.items;
}

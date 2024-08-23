import type { AnnotationNode, RecordProperty } from '@sap-ux/cds-annotation-parser';
import { RECORD_PROPERTY_TYPE, nodeRange } from '@sap-ux/cds-annotation-parser';

import type { Element } from '@sap-ux/odata-annotation-core-types';
import { createElementNode, Edm, Position } from '@sap-ux/odata-annotation-core-types';
import { convertFlattenedPath } from '../flattened';

import type { NodeHandler, Subtree } from '../handler';
import { getImplicitPropertyType } from '../type-resolver';
import type { VisitorState } from '../visitor-state';
import { createPropertyAttribute, createTermAttribute } from '../creators';

export const recordPropertyHandler: NodeHandler<RecordProperty> = {
    type: RECORD_PROPERTY_TYPE,
    getChildren(state: VisitorState, node: RecordProperty): AnnotationNode[] {
        if (node.value) {
            return [node.value];
        }
        return [];
    },
    convert(state: VisitorState, node: RecordProperty): Element | Subtree | undefined {
        if (state.context.inValueContainer) {
            // Since only annotations are allowed here, we assume it is one
            const element: Element = createElementNode({
                name: Edm.Annotation,
                range: nodeRange(node, true)
            });

            element.attributes[Edm.Term] = createTermAttribute(node.name.value, nodeRange(node.name, false));

            if (node.value) {
                element.contentRange = nodeRange(node.value, true);
            }

            return element;
        }
        if (node.name.segments.length === 1) {
            const element: Element = createElementNode({
                name: Edm.PropertyValue,
                range: nodeRange(node, true)
            });

            element.attributes[Edm.Property] = createPropertyAttribute(node.name.value, nodeRange(node.name, false));

            const recordPropertyType = getImplicitPropertyType(
                state.vocabularyService,
                state.context,
                node.name.value
            )?.type;
            state.pushContext({ ...state.context, valueType: recordPropertyType, propertyName: node.name.value });
            if (node.value) {
                element.contentRange = nodeRange(node.value, true);
                // take into account colon
                if (node.colon && element.contentRange) {
                    const colonPosition = node?.colon?.range?.end;
                    // position right after colon should be counted as part of the elements content
                    element.contentRange.start = colonPosition
                        ? Position.create(colonPosition.line, colonPosition.character)
                        : Position.create(0, 0);
                }
            }
            return element;
        } else {
            return convertFlattenedPath(state, node.name.segments, node.value);
        }
    }
};

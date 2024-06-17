import type { AnyNode } from '@sap-ux/odata-annotation-core-types';
import type { JsonPointer } from '../types';

/**
 *  Traverses the object tree and finds a node based on the pointer.
 *
 * @param root - Root of the object tree.
 * @param pointer - Pointer pointing to a specific node.
 * @returns A node.
 */
export function getGenericNodeFromPointer(root: AnyNode, pointer: JsonPointer): AnyNode | undefined {
    const segments = pointer.slice(1).split('/');

    let node: AnyNode = root;
    for (const segment of segments) {
        const next: AnyNode | undefined = (node as unknown as { [key: string]: AnyNode })[segment];
        if (next) {
            node = next;
        } else {
            return undefined;
        }
    }
    return node;
}

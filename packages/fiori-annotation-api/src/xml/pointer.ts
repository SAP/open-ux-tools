import type { XMLAstNode, XMLDocument } from '@xml-tools/ast';

/**
 *  Returns node matching the pointer.
 *
 * @param document - XML document.
 * @param pointer - Pointer identifying a specific node in the document.
 * @returns Node matching the pointer if it exists.
 */
export function getNodeFromPointer(document: XMLDocument, pointer: string): XMLAstNode | undefined {
    const segments = pointer.slice(1).split('/');

    if (segments.length === 0) {
        return undefined;
    }
    let node: XMLAstNode = document;
    for (const segment of segments) {
        const next: XMLAstNode | undefined = (node as unknown as { [key: string]: XMLAstNode })[segment];
        if (next) {
            node = next;
        } else {
            return undefined;
        }
    }
    return node;
}

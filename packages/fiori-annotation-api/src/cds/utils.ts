import type { CdsCompilerFacade } from '@sap/ux-cds-compiler-facade';
import { createMetadataCollector } from '@sap/ux-cds-compiler-facade';

import type { Range } from '@sap-ux/odata-annotation-core-types';
import { GHOST_FILENAME_PREFIX } from '@sap-ux/odata-annotation-core-types';

import type { Annotation } from '@sap-ux/cds-annotation-parser';
import { ANNOTATION_TYPE, ANNOTATION_GROUP_ITEMS_TYPE } from '@sap-ux/cds-annotation-parser';
import type { Target } from '@sap-ux/cds-odata-annotation-converter';
import { TARGET_TYPE } from '@sap-ux/cds-odata-annotation-converter';

import { ApiError, ApiErrorCode } from '../error';
import type { AstNode } from './document';
import type { CompilerToken } from './cds-compiler-tokens';

/**
 *  Normalizes URI.
 *
 * @param fileUri - URI as a string.
 * @param removeGhostFilePrefix - Flag indicating if the ghost file prefix should be removed from the uri.
 * @returns Normalized file URI.
 */
export function toUnifiedUri(fileUri: string | undefined, removeGhostFilePrefix = true): string {
    const unifiedUri = (fileUri ?? '').replace(/\\/g, '/').replace(/\/\//g, '/');
    return removeGhostFilePrefix ? unifiedUri.replace(GHOST_FILENAME_PREFIX, '') : unifiedUri;
}

/**
 * Get token indices for the corresponding range.
 *
 * @param tokens - All tokens in the document.
 * @param range - Range for which tokens will be matched.
 * @returns Start and end token indices for the range.
 */
export function getTokenRange(tokens: CompilerToken[], range: Range): { start: number; end: number } {
    const start = tokens.findIndex(
        (token) => token.line === range.start.line + 1 && token.column === range.start.character
    );
    let end = -1;
    if (start > -1) {
        end = tokens
            .slice(start)
            .findIndex(
                (token) =>
                    token.line > range.end.line + 1 ||
                    (token.line === range.end.line + 1 && token.column >= range.end.character)
            );
        end = start + end - 1;
    }
    return { start, end };
}

/**
 * Finds annotation in assignment based on AST node.
 *
 * @param facade - CDS compiler facade instance.
 * @param node - AST node.
 * @param parent - Parent AST node.
 * @param greatGrandParent - Great grand parent node.
 * @returns Annotation node and EDMX path.
 */
export function getAnnotationFromAssignment(
    facade: CdsCompilerFacade,
    node: AstNode,
    parent?: AstNode,
    greatGrandParent?: AstNode
): [Annotation, string] {
    const [annotation, target] = findAnnotation(node, parent, greatGrandParent);

    const { edmxPath } = facade.collectMetadataForAbsolutePath(
        target.name,
        target.kind,
        createMetadataCollector(new Map(), facade)
    );
    return [annotation, edmxPath];
}

function findAnnotation(node: AstNode, parent?: AstNode, greatGrandParent?: AstNode): [Annotation, Target] {
    if (node.type === TARGET_TYPE) {
        // if no assignment is specified we default to the first one
        const assignment = node.assignments[0];
        if (assignment) {
            const annotation = assignment?.type === 'annotation-group' ? assignment.items.items[0] : assignment;
            return [annotation, node];
        }
    } else if (node?.type === ANNOTATION_TYPE) {
        if (parent?.type === TARGET_TYPE) {
            return [node, parent];
        } else if (greatGrandParent?.type === TARGET_TYPE && parent?.type === ANNOTATION_GROUP_ITEMS_TYPE) {
            return [node, greatGrandParent];
        }
    }
    throw new ApiError(`Could not find annotation in node of type ${node.type}.`, ApiErrorCode.General);
}

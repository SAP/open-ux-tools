import type { UiElementNode } from './types.js';

/**
 * Default depth for an unscoped `describe_ui` overview. Depth 2 shows the
 * top-level containers (pages, object page, RTA toolbar) and their immediate
 * children (sections, tabs, toolbar buttons) — enough to decide which subtree to
 * inspect — while keeping the response small on a large page. The model drills
 * into a `truncated` node by calling `describe_ui` again with its id as
 * `rootElementId` (which returns that subtree at full depth).
 */
export const DEFAULT_DESCRIBE_UI_DEPTH = 2;

/**
 * Returns a copy of `node` whose descendants are trimmed to `maxDepth` levels
 * (the root is depth 1). A node at the depth boundary that has children keeps no
 * `children`, and is instead marked `truncated: true` with `childCount` set to
 * the number of omitted direct children, signalling the caller to drill in with
 * `rootElementId`. `maxDepth <= 0` means no trimming (full tree).
 *
 * @param node The root node to trim.
 * @param maxDepth Maximum depth to retain, or `0` for the full tree.
 * @param depth The current node's depth (1 for the root); used internally.
 * @returns The trimmed node (a new object; the input is not mutated).
 */
export function trimTreeToDepth(node: UiElementNode, maxDepth: number, depth = 1): UiElementNode {
    const { children, ...rest } = node;
    if (!children || children.length === 0) {
        return { ...rest };
    }
    if (maxDepth > 0 && depth >= maxDepth) {
        return { ...rest, truncated: true, childCount: children.length };
    }
    return { ...rest, children: children.map((child) => trimTreeToDepth(child, maxDepth, depth + 1)) };
}

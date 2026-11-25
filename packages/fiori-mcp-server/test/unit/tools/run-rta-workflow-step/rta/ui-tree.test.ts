import { describe, expect, test } from '@jest/globals';
import {
    DEFAULT_DESCRIBE_UI_DEPTH,
    trimTreeToDepth
} from '../../../../../src/tools/run-rta-workflow-step/rta/ui-tree.js';

describe('rta/ui-tree', () => {
    describe('trimTreeToDepth', () => {
        const deepTree = {
            id: 'root',
            type: 'objectPage',
            children: [
                {
                    id: 's1',
                    type: 'section',
                    children: [{ id: 'f1', type: 'input', children: [{ id: 'inner', type: 'text' }] }]
                },
                { id: 's2', type: 'section' } // leaf section, no children
            ]
        };

        test('depth 1 keeps only the root and marks its children truncated with a count', () => {
            expect(trimTreeToDepth(deepTree, 1)).toEqual({
                id: 'root',
                type: 'objectPage',
                truncated: true,
                childCount: 2
            });
        });

        test('depth 2 keeps immediate children; a child with grandchildren is truncated, a leaf child is not', () => {
            expect(trimTreeToDepth(deepTree, 2)).toEqual({
                id: 'root',
                type: 'objectPage',
                children: [
                    { id: 's1', type: 'section', truncated: true, childCount: 1 },
                    { id: 's2', type: 'section' }
                ]
            });
        });

        test('a leaf node is returned unchanged (no truncated marker)', () => {
            expect(trimTreeToDepth({ id: 'leaf', type: 'button' }, 2)).toEqual({ id: 'leaf', type: 'button' });
        });

        test('maxDepth 0 returns the full tree untrimmed', () => {
            expect(trimTreeToDepth(deepTree, 0)).toEqual(deepTree);
        });

        test('does not mutate the input tree', () => {
            const snapshot = JSON.parse(JSON.stringify(deepTree));
            trimTreeToDepth(deepTree, 1);
            expect(deepTree).toEqual(snapshot);
        });

        test('the default overview depth keeps the top two levels', () => {
            expect(DEFAULT_DESCRIBE_UI_DEPTH).toBe(2);
            expect(trimTreeToDepth(deepTree, DEFAULT_DESCRIBE_UI_DEPTH)).toEqual({
                id: 'root',
                type: 'objectPage',
                children: [
                    { id: 's1', type: 'section', truncated: true, childCount: 1 },
                    { id: 's2', type: 'section' }
                ]
            });
        });
    });
});

import { getMissingReferentialConstraintsPrompts } from '../../src/data-download/prompts/ref-constrainsts';
import type { HierarchyEntity } from '../../src/data-download/types';

function makeEntity(overrides: Partial<HierarchyEntity> = {}): HierarchyEntity {
    return {
        entitySetName: 'Items',
        entityTypeName: 'ItemType',
        qualifier: 'ItemHierarchy',
        nodeProperty: 'NodeId',
        parentProperty: undefined,
        parentPropertyType: undefined,
        isDraft: false,
        entityTypeKeys: ['Id'],
        entityProperties: ['Id', 'Name', 'Value'],
        missingReferentialConstraints: { navPropName: '_Parent', constraints: [] },
        ...overrides
    };
}

describe('getMissingReferentialConstraintsPrompts', () => {
    it('should return empty array when given no entities', () => {
        expect(getMissingReferentialConstraintsPrompts([])).toEqual([]);
    });

    it('should return empty array when all entities have a parentProperty', () => {
        const entity = makeEntity({ parentProperty: 'ParentId' });
        expect(getMissingReferentialConstraintsPrompts([entity])).toEqual([]);
    });

    it('should return two prompts for an entity without parentProperty', () => {
        const entity = makeEntity();
        const prompts = getMissingReferentialConstraintsPrompts([entity]);

        expect(prompts).toHaveLength(2);
    });

    it('should set correct name, type, default and choices on both prompts', () => {
        const entity = makeEntity();
        const [source, target] = getMissingReferentialConstraintsPrompts([entity]);

        expect(source.name).toBe('Items/NodeId/source');
        expect(source.type).toBe('list');
        expect(source.default).toBe(false);
        expect(source.choices).toEqual([
            { name: 'Id', value: 'Id' },
            { name: 'Name', value: 'Name' },
            { name: 'Value', value: 'Value' }
        ]);

        expect(target.name).toBe('Items/NodeId/target');
        expect(target.type).toBe('list');
        expect(target.default).toBe(false);
        expect(target.choices).toEqual(source.choices);
    });

    it('should include navPropName in the prompt messages', () => {
        const entity = makeEntity({ missingReferentialConstraints: { navPropName: '_Parent', constraints: [] } });
        const [source, target] = getMissingReferentialConstraintsPrompts([entity]);

        expect(source.message).toContain('_Parent');
        expect(target.message).toContain('_Parent');
        expect(source.message).toContain('Items');
        expect(target.message).toContain('Items');
    });

    it('should only generate prompts for entities without parentProperty', () => {
        const withParent = makeEntity({ entitySetName: 'WithParent', parentProperty: 'ParentId' });
        const withoutParent = makeEntity({ entitySetName: 'WithoutParent' });

        const prompts = getMissingReferentialConstraintsPrompts([withParent, withoutParent]);

        expect(prompts).toHaveLength(2);
        expect(prompts.every((p) => (p.name as string).startsWith('WithoutParent'))).toBe(true);
    });

    it('should generate two prompts per qualifying entity', () => {
        const a = makeEntity({ entitySetName: 'A', nodeProperty: 'NodeA' });
        const b = makeEntity({ entitySetName: 'B', nodeProperty: 'NodeB' });

        const prompts = getMissingReferentialConstraintsPrompts([a, b]);

        expect(prompts).toHaveLength(4);
        expect(prompts[0].name).toBe('A/NodeA/source');
        expect(prompts[1].name).toBe('A/NodeA/target');
        expect(prompts[2].name).toBe('B/NodeB/source');
        expect(prompts[3].name).toBe('B/NodeB/target');
    });
});

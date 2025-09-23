import type { EntitySet } from '@sap-ux/vocabularies-types';
import { getEntitySetOptions, resolveEntitySetTargets } from '../../../src/building-block/prompts/utils/prompt-helpers';
import { bindingContextRelative } from '../../../src/building-block/types';

describe('getEntitySetOptions', () => {
    const entitySets = [
        {
            name: 'MainSet',
            entityType: {
                navigationProperties: [
                    { name: 'NavA', isCollection: false, targetTypeName: 'NavAType' },
                    { name: 'NavB', isCollection: true, targetTypeName: 'NavBType' },
                    { name: 'NavC', isCollection: false, targetTypeName: 'NavCType' }
                ]
            }
        },
        {
            name: 'OtherSet',
            entityType: {
                navigationProperties: [{ name: 'NavX', isCollection: false, targetTypeName: 'NavXType' }]
            }
        }
    ] as EntitySet[];

    it('returns all entity sets if pageContextEntitySet does not match', () => {
        const result = getEntitySetOptions(entitySets, 'UnknownSet');
        expect(result).toEqual(entitySets);
    });

    it('returns only the matching entity set for absolute context', () => {
        const result = getEntitySetOptions(entitySets, 'MainSet');
        expect(result).toEqual([entitySets[0]]);
    });

    it('returns non-collection navigation properties for relative context', () => {
        const result = getEntitySetOptions(entitySets, 'MainSet', bindingContextRelative);
        expect(result).toEqual([
            { name: 'NavA', isCollection: false, targetTypeName: 'NavAType' },
            { name: 'NavC', isCollection: false, targetTypeName: 'NavCType' }
        ]);
    });

    it('filters out navigation properties listed in filterEntityProperties', () => {
        const result = getEntitySetOptions(entitySets, 'MainSet', bindingContextRelative, ['NavA']);
        expect(result).toEqual([{ name: 'NavC', isCollection: false, targetTypeName: 'NavCType' }]);
    });

    it('returns empty array if no non-collection navigation properties exist', () => {
        const entitySetsNoNav = [
            {
                name: 'EmptySet',
                entityType: {
                    navigationProperties: [{ name: 'NavB', isCollection: true, targetTypeName: 'NavBType' }]
                }
            }
        ] as EntitySet[];
        const result = getEntitySetOptions(entitySetsNoNav, 'EmptySet', bindingContextRelative);
        expect(result).toEqual([]);
    });

    it('returns empty array if entityType.navigationProperties is undefined', () => {
        const entitySetsNoNav = [
            {
                name: 'EmptySet',
                entityType: {}
            }
        ] as EntitySet[];
        const result = getEntitySetOptions(entitySetsNoNav, 'EmptySet', bindingContextRelative);
        expect(result).toEqual([]);
    });
});

describe('resolveEntitySetTargets', () => {
    const entitySets = [
        {
            name: 'MainSet',
            entityTypeName: 'MainType',
            entityType: {
                entityProperties: [{ name: 'PropA' }, { name: 'PropB' }],
                navigationProperties: [
                    { name: 'NavA', isCollection: false, targetTypeName: 'NavTypeA' },
                    { name: 'NavB', isCollection: true, targetTypeName: 'NavTypeB' }
                ]
            }
        },
        {
            name: 'NavSetA',
            entityTypeName: 'NavTypeA',
            entityType: {
                entityProperties: [{ name: 'NavPropA1' }, { name: 'NavPropA2' }]
            }
        },
        {
            name: 'NavSetB',
            entityTypeName: 'NavTypeB',
            entityType: {
                entityProperties: [{ name: 'NavPropB1' }]
            }
        }
    ] as EntitySet[];

    it('returns empty array if no selectedContext is provided', () => {
        const result = resolveEntitySetTargets(entitySets, 'MainSet', undefined, undefined);
        expect(result).toEqual([]);
    });

    it('returns properties of the selected entity set for absolute context', () => {
        const result = resolveEntitySetTargets(entitySets, 'MainSet', undefined, 'MainSet');
        expect(result).toEqual([{ name: 'PropA' }, { name: 'PropB' }]);
    });

    it('returns properties of the navigation target entity set for relative context', () => {
        const result = resolveEntitySetTargets(entitySets, 'MainSet', bindingContextRelative, 'NavA');
        expect(result).toEqual([{ name: 'NavPropA1' }, { name: 'NavPropA2' }]);
    });

    it('returns empty array if navigation property does not exist', () => {
        const result = resolveEntitySetTargets(entitySets, 'MainSet', bindingContextRelative, 'NonExistentNav');
        expect(result).toEqual([]);
    });

    it('returns empty array if target entity set does not exist', () => {
        // Add a navigation property with a targetTypeName that doesn't match any entity set
        const entitySetsWithBadNav = [
            {
                name: 'MainSet',
                entityTypeName: 'MainType',
                entityType: {
                    entityProperties: [{ name: 'PropA' }],
                    navigationProperties: [{ name: 'NavBad', isCollection: false, targetTypeName: 'MissingType' }]
                }
            }
        ] as EntitySet[];
        const result = resolveEntitySetTargets(entitySetsWithBadNav, 'MainSet', bindingContextRelative, 'NavBad');
        expect(result).toEqual([]);
    });

    it('returns empty array if entity set does not exist', () => {
        const result = resolveEntitySetTargets(entitySets, 'UnknownSet', undefined, 'UnknownSet');
        expect(result).toEqual([]);
    });
});

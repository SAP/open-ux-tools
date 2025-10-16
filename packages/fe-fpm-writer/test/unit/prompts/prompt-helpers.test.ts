import type { EntitySet } from '@sap-ux/vocabularies-types';
import { getEntitySetOptions, resolveEntitySetTargets } from '../../../src/building-block/prompts/utils/prompt-helpers';
import { bindingContextAbsolute, bindingContextRelative } from '../../../src/building-block/types';
import type { PromptContext } from '../../../src/prompts/types';
import * as promptHelpers from '../../../src/building-block/prompts/utils/prompt-helpers';
import { i18nNamespaces, translate } from '../../../src/i18n';
const t = translate(i18nNamespaces.buildingBlock, 'prompts.');

import { getEntitySets } from '../../../src/building-block/prompts/utils/service';
jest.mock('../../../src/building-block/prompts/utils/service', () => ({
    getEntitySets: jest.fn()
}));

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

    it('returns properties for selected entity set when page context is undefined', () => {
        const result = resolveEntitySetTargets(entitySets, undefined, undefined, 'MainSet');
        expect(result).toEqual([{ name: 'PropA' }, { name: 'PropB' }]);
    });
});

describe('resolveBindingContextTypeChoices', () => {
    const { entitySetCache } = promptHelpers;
    beforeEach(() => {
        (getEntitySets as jest.Mock).mockClear();
        for (const key of Object.keys(entitySetCache)) {
            delete entitySetCache[key];
        }
    });

    it('returns choices with relative disabled when no entity sets available for relative', async () => {
        (getEntitySets as jest.Mock).mockResolvedValue([
            {
                name: 'MainSet',
                entityType: {
                    navigationProperties: [{ name: 'NavB', isCollection: true, targetTypeName: 'NavBType' }],
                    entityProperties: []
                },
                entityTypeName: 'MainType'
            }
        ]);

        const context = {
            project: { projectType: 'mockProject', apps: { app1: { mainService: 'MainService' } } },
            appId: 'app1',
            options: { pageContextEntitySet: 'MainSet' }
        } as unknown as PromptContext;

        const getChoicesFn = promptHelpers.resolveBindingContextTypeChoices(context);
        const choices = typeof getChoicesFn === 'function' ? await getChoicesFn() : getChoicesFn;

        expect(choices).toEqual([
            { name: t('common.bindingContextType.option.absolute'), value: bindingContextAbsolute },
            {
                name: t('common.bindingContextType.option.relative'),
                value: bindingContextRelative,
                disabled: true,
                title: t('richTextEditor.relativeBindingDisabledTooltip')
            }
        ]);
    });

    it('returns both options enabled when entity sets for relative are available', async () => {
        (getEntitySets as jest.Mock).mockResolvedValue([
            {
                name: 'MainSet',
                entityType: {
                    navigationProperties: [{ name: 'NavA', isCollection: false, targetTypeName: 'NavAType' }],
                    entityProperties: []
                },
                entityTypeName: 'MainType'
            }
        ]);

        const context = {
            project: { projectType: 'mockProject', apps: { app1: { mainService: 'MainService' } } },
            appId: 'app1',
            options: { pageContextEntitySet: 'MainSet' }
        } as unknown as PromptContext;

        const getChoicesFn = promptHelpers.resolveBindingContextTypeChoices(context);
        const choices = typeof getChoicesFn === 'function' ? await getChoicesFn() : getChoicesFn;

        expect(choices).toEqual([
            { name: t('common.bindingContextType.option.absolute'), value: bindingContextAbsolute },
            { name: t('common.bindingContextType.option.relative'), value: bindingContextRelative }
        ]);
    });

    it('returns default choices when project is not present', () => {
        const choices = promptHelpers.resolveBindingContextTypeChoices({ project: undefined } as any);
        expect(choices).toEqual([
            { name: t('common.bindingContextType.option.absolute'), value: bindingContextAbsolute },
            { name: t('common.bindingContextType.option.relative'), value: bindingContextRelative }
        ]);
    });

    it('returns both binding context options enabled when pageContextEntitySet is not provided', async () => {
        (getEntitySets as jest.Mock).mockResolvedValue([
            {
                name: 'MainSet',
                entityType: {
                    navigationProperties: [{ name: 'NavA', isCollection: false, targetTypeName: 'NavAType' }],
                    entityProperties: []
                },
                entityTypeName: 'MainType'
            }
        ]);

        const context = {
            project: { projectType: 'mockProject', apps: { app1: { mainService: 'MainService' } } },
            appId: 'app1'
        } as unknown as PromptContext;

        const getChoicesFn = promptHelpers.resolveBindingContextTypeChoices(context);
        const choices = typeof getChoicesFn === 'function' ? await getChoicesFn() : getChoicesFn;

        expect(choices).toEqual([
            { name: t('common.bindingContextType.option.absolute'), value: bindingContextAbsolute },
            { name: t('common.bindingContextType.option.relative'), value: bindingContextRelative }
        ]);
    });
});

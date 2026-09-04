import { lookupAggregation } from '../../../../src/tools/lookup-ui5-documentation/lookups/aggregation.js';
import { lookupProperty } from '../../../../src/tools/lookup-ui5-documentation/lookups/property.js';
import { lookupEvent } from '../../../../src/tools/lookup-ui5-documentation/lookups/event.js';
import { findMemberInChain, knownMemberNames } from '../../../../src/tools/lookup-ui5-documentation/lookups/find-member.js';
import type { LookupSource, Ui5Aggregation, Ui5Symbol } from '../../../../src/tools/lookup-ui5-documentation/types.js';
import type { LookupUi5DocumentationInput } from '../../../../src/types/index.js';

// given: a three-class cross-library inheritance chain [Table -> ListBase -> Control]
const table: Ui5Symbol = {
    name: 'sap.m.Table',
    extends: 'sap.m.ListBase',
    'ui5-metadata': {
        aggregations: [
            {
                name: 'columns',
                type: 'sap.m.Column',
                cardinality: '0..n',
                visibility: 'public',
                since: '1.16',
                description: 'The columns.'
            }
        ],
        properties: [
            {
                name: 'growing',
                type: 'boolean',
                defaultValue: false,
                group: 'Behavior',
                bindable: true,
                visibility: 'public',
                since: '1.16',
                description: 'Enables growing.'
            }
        ],
        events: [
            {
                name: 'select',
                visibility: 'public',
                since: '1.16',
                description: 'Fires on selection.',
                parameters: { listItem: { name: 'listItem', type: 'sap.m.ListItemBase', description: 'The selected item.' } }
            }
        ]
    }
};
const listBase: Ui5Symbol = {
    name: 'sap.m.ListBase',
    extends: 'sap.ui.core.Control',
    'ui5-metadata': {
        aggregations: [{ name: 'items', type: 'sap.m.ListItemBase', cardinality: '0..n', visibility: 'public' }]
    }
};
const control: Ui5Symbol = {
    name: 'sap.ui.core.Control',
    'ui5-metadata': {
        properties: [{ name: 'busy', type: 'boolean', defaultValue: false, group: 'Misc', bindable: true, visibility: 'public' }],
        events: [{ name: 'validationError', visibility: 'public', parameters: { element: { name: 'element', type: 'sap.ui.core.Element' } } }]
    }
};
const chain: Ui5Symbol[] = [table, listBase, control];

const source: LookupSource = {
    url: 'https://ui5.sap.com/1.120.0/test-resources/sap/m/designtime/api.json',
    mode: 'network',
    base: 'https://ui5.sap.com',
    version: '1.120.0',
    fallbackUsed: false
};

const baseInput = (member: string | undefined, lookupType: LookupUi5DocumentationInput['lookupType']): LookupUi5DocumentationInput => ({
    lookupType,
    library: 'sap.m',
    control: 'sap.m.Table',
    member
});

describe('lookup handlers', () => {
    describe('lookupAggregation', () => {
        test('returns an own aggregation with inherited=false', () => {
            // when
            const result = lookupAggregation(chain, baseInput('columns', 'aggregation'), source);
            // then
            expect(result).toMatchObject({
                lookupType: 'aggregation',
                control: 'sap.m.Table',
                definedIn: 'sap.m.Table',
                inherited: false,
                aggregation: 'columns',
                type: 'sap.m.Column',
                cardinality: '0..n',
                visibility: 'public',
                since: '1.16',
                description: 'The columns.'
            });
        });

        test('resolves an inherited aggregation to its declaring class', () => {
            // when
            const result = lookupAggregation(chain, baseInput('items', 'aggregation'), source);
            // then
            expect(result.definedIn).toBe('sap.m.ListBase');
            expect(result.inherited).toBe(true);
            expect(result.since).toBeNull();
            expect(result.description).toBeNull();
        });

        test('throws when member is missing', () => {
            expect(() => lookupAggregation(chain, baseInput(undefined, 'aggregation'), source)).toThrow(
                'The "member" parameter is required when lookupType is "aggregation".'
            );
        });

        test('throws with the known aggregation names when not found', () => {
            expect(() => lookupAggregation(chain, baseInput('missing', 'aggregation'), source)).toThrow(
                /Aggregation missing not found on sap.m.Table.*Known aggregations: columns, items\./
            );
        });
    });

    describe('lookupProperty', () => {
        test('resolves an inherited cross-library property', () => {
            // when
            const result = lookupProperty(chain, baseInput('busy', 'property'), source);
            // then
            expect(result).toMatchObject({
                lookupType: 'property',
                definedIn: 'sap.ui.core.Control',
                inherited: true,
                property: 'busy',
                type: 'boolean',
                defaultValue: false,
                group: 'Misc',
                bindable: true,
                visibility: 'public',
                since: null,
                description: null
            });
        });

        test('returns an own property with inherited=false', () => {
            const result = lookupProperty(chain, baseInput('growing', 'property'), source);
            expect(result.definedIn).toBe('sap.m.Table');
            expect(result.inherited).toBe(false);
            expect(result.since).toBe('1.16');
        });

        test('throws when member is missing', () => {
            expect(() => lookupProperty(chain, baseInput(undefined, 'property'), source)).toThrow(
                'The "member" parameter is required when lookupType is "property".'
            );
        });

        test('throws with the known property names when not found', () => {
            expect(() => lookupProperty(chain, baseInput('missing', 'property'), source)).toThrow(
                /Property missing not found.*Known properties: growing, busy\./
            );
        });
    });

    describe('lookupEvent', () => {
        test('returns an own event and preserves parameters as a record', () => {
            // when
            const result = lookupEvent(chain, baseInput('select', 'event'), source);
            // then
            expect(result.definedIn).toBe('sap.m.Table');
            expect(result.inherited).toBe(false);
            expect(result.event).toBe('select');
            expect(result.parameters).toEqual({
                listItem: { name: 'listItem', type: 'sap.m.ListItemBase', description: 'The selected item.' }
            });
        });

        test('resolves an inherited event', () => {
            const result = lookupEvent(chain, baseInput('validationError', 'event'), source);
            expect(result.definedIn).toBe('sap.ui.core.Control');
            expect(result.inherited).toBe(true);
            expect(result.parameters).toEqual({ element: { name: 'element', type: 'sap.ui.core.Element' } });
            expect(result.since).toBeNull();
        });

        test('throws when member is missing', () => {
            expect(() => lookupEvent(chain, baseInput(undefined, 'event'), source)).toThrow(
                'The "member" parameter is required when lookupType is "event".'
            );
        });

        test('throws with the known event names when not found', () => {
            expect(() => lookupEvent(chain, baseInput('missing', 'event'), source)).toThrow(
                /Event missing not found.*Known events: select, validationError\./
            );
        });
    });
});

describe('findMemberInChain / knownMemberNames', () => {
    const selectAggs = (s: Ui5Symbol): Ui5Aggregation[] | undefined => s['ui5-metadata']?.aggregations;

    test('finds the first match and reports its declaring class', () => {
        const found = findMemberInChain(chain, selectAggs, 'items');
        expect(found?.definedIn).toBe('sap.m.ListBase');
        expect(found?.member.name).toBe('items');
    });

    test('returns null when no symbol in the chain declares the member', () => {
        expect(findMemberInChain(chain, selectAggs, 'nope')).toBeNull();
    });

    test('collects deduplicated member names across the chain', () => {
        expect(knownMemberNames(chain, selectAggs)).toEqual(['columns', 'items']);
    });
});

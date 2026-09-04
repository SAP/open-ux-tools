import { jest } from '@jest/globals';
import type { ApiJson, ResolveApiJsonResult, Ui5Symbol } from '../../../../src/tools/lookup-ui5-documentation/types.js';
import type { LookupUi5DocumentationInput } from '../../../../src/types/index.js';

// ── Mock api-json.js ONLY; real handlers do the extraction ───────────────────
const mockResolveUi5Config = jest.fn<any>();
const mockResolveApiJson = jest.fn<any>();
const mockFindControl = jest.fn<any>();
const mockResolveControlChain = jest.fn<any>();
jest.unstable_mockModule('../../../../src/tools/lookup-ui5-documentation/api-json.js', () => ({
    resolveUi5Config: mockResolveUi5Config,
    resolveApiJson: mockResolveApiJson,
    findControl: mockFindControl,
    resolveControlChain: mockResolveControlChain
}));

// ── Import SUT AFTER mocks ───────────────────────────────────────────────────
const { lookupUi5Documentation } = await import('../../../../src/tools/lookup-ui5-documentation/index.js');

// ── Shared test fixtures ─────────────────────────────────────────────────────
const symbol: Ui5Symbol = {
    name: 'sap.m.Table',
    'ui5-metadata': {
        aggregations: [{ name: 'columns', type: 'sap.m.Column', cardinality: '0..n', visibility: 'public' }],
        properties: [{ name: 'growing', type: 'boolean', defaultValue: false, group: 'Behavior', bindable: true, visibility: 'public' }],
        events: [{ name: 'select', visibility: 'public', parameters: { item: { name: 'item', type: 'sap.m.Item', description: 'The item.' } } }]
    }
};

const resolveResult: ResolveApiJsonResult = {
    data: { symbols: [symbol] } as ApiJson,
    source: 'network',
    url: 'https://ui5.sap.com/test-resources/sap/m/designtime/api.json',
    base: 'https://ui5.sap.com',
    version: null
};

function input(
    lookupType: LookupUi5DocumentationInput['lookupType'],
    member: string,
    library = 'sap.m',
    control = 'sap.m.Table'
): LookupUi5DocumentationInput {
    return { lookupType, library, control, member };
}

beforeEach(() => {
    mockResolveUi5Config.mockResolvedValue({ url: null, version: null });
    mockResolveApiJson.mockResolvedValue(resolveResult);
    mockFindControl.mockReturnValue(symbol);
    mockResolveControlChain.mockResolvedValue([symbol]);
});

// ─────────────────────────────────────────────────────────────────────────────
describe('lookupUi5Documentation', () => {
    test('dispatches to the aggregation handler', async () => {
        // when
        const result = await lookupUi5Documentation(input('aggregation', 'columns'));
        // then
        expect(result.lookupType).toBe('aggregation');
        expect((result as any).aggregation).toBe('columns');
        expect((result as any).type).toBe('sap.m.Column');
    });

    test('dispatches to the property handler', async () => {
        const result = await lookupUi5Documentation(input('property', 'growing'));
        expect(result.lookupType).toBe('property');
        expect((result as any).property).toBe('growing');
        expect((result as any).type).toBe('boolean');
    });

    test('dispatches to the event handler', async () => {
        const result = await lookupUi5Documentation(input('event', 'select'));
        expect(result.lookupType).toBe('event');
        expect((result as any).event).toBe('select');
    });

    test('throws when resolveApiJson returns null', async () => {
        // given
        mockResolveApiJson.mockResolvedValue(null);
        // when / then
        await expect(lookupUi5Documentation(input('aggregation', 'columns'))).rejects.toThrow(
            'Could not fetch api.json for sap.m'
        );
    });

    test('throws when findControl returns null', async () => {
        // given
        mockFindControl.mockReturnValue(null);
        // when / then
        await expect(lookupUi5Documentation(input('aggregation', 'columns'))).rejects.toThrow(
            'Control sap.m.Table not found in sap.m api.json'
        );
    });

    test('sets fallbackUsed=true when configured base differs from result base', async () => {
        // given: ui5.yaml pointed to a custom base but resolve used the public fallback
        mockResolveUi5Config.mockResolvedValue({ url: 'https://custom.ui5.com', version: null });
        mockResolveApiJson.mockResolvedValue({ ...resolveResult, base: 'https://ui5.sap.com' });
        // when
        const result = await lookupUi5Documentation(input('aggregation', 'columns'));
        // then
        expect((result as any).source.fallbackUsed).toBe(true);
    });

    test('sets fallbackUsed=true when configured version was dropped in favour of latest', async () => {
        // given: ui5.yaml had version but resolve succeeded without it (version=null in result)
        mockResolveUi5Config.mockResolvedValue({ url: null, version: '1.120.0' });
        mockResolveApiJson.mockResolvedValue({ ...resolveResult, base: 'https://ui5.sap.com', version: null });
        // when
        const result = await lookupUi5Documentation(input('aggregation', 'columns'));
        // then
        expect((result as any).source.fallbackUsed).toBe(true);
    });

    test('sets fallbackUsed=false when no configured base or version exists', async () => {
        // given: no yaml config at all — resolveUi5Config already returns null/null
        const result = await lookupUi5Documentation(input('aggregation', 'columns'));
        // then
        expect((result as any).source.fallbackUsed).toBe(false);
    });

    test('passes the appPath to resolveUi5Config', async () => {
        // given
        const appPath = '/some/app/path';
        // when
        await lookupUi5Documentation({ ...input('aggregation', 'columns'), appPath });
        // then
        expect(mockResolveUi5Config).toHaveBeenCalledWith(appPath);
    });
});

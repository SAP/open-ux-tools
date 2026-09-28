import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {
    CURRENCIES,
    DEFAULT_SAMPLE_DATASET,
    FIELD_CONTROL_VALUES,
    LOCATIONS,
    STATUS_SAMPLES,
    UNITS,
    UNIT_ISO_CODES,
    UNIT_SAMPLES,
    VALUE_BANKS,
    VALUE_BANK_STORE_PATH,
    VALUE_BANK_STORE_SHA256,
    conceptValueBank,
    packagedConceptBank,
    parseValueBankStore,
    requiredIntegerBankValues,
    requiredPairBankValues,
    requiredRecordBankValues,
    requiredRoleBankValues,
    roleBankValues,
    roleSamples
} from '../../src/semantics/bank-store.js';
import { SEMANTIC_CATALOG_FINGERPRINT, SEMANTIC_CATALOG_VERSION } from '../../src/semantics/value-banks.js';

const store = (banks: Record<string, unknown>) => ({ format: 'mockgen-value-banks', version: 1, banks });

const exampleBanks = {
    'role:currencies': { kind: 'role', id: 'currencies', valueKind: 'code', values: ['EUR', 'USD'] },
    'role:field-control-values': { kind: 'role', id: 'field-control-values', valueKind: 'integer', values: [0, 7] },
    'role:statuses': {
        kind: 'role',
        id: 'statuses',
        valueKind: 'code-text',
        pairs: [{ code: 'O', text: 'Open' }]
    },
    'role:cities': {
        kind: 'role',
        id: 'cities',
        valueKind: 'record',
        fields: { city: 'string', digits: 'integer' },
        records: [{ city: 'Berlin', digits: 7 }]
    },
    'concept:headcount': {
        kind: 'concept',
        id: 'headcount',
        name: 'headcount',
        valueKind: 'number',
        types: ['int'],
        range: { min: 1, max: 500, scale: 0 }
    },
    'concept:purchasing-group': {
        kind: 'concept',
        id: 'purchasing-group',
        name: 'purchasing group',
        valueKind: 'code-text',
        types: ['string'],
        pairs: [{ code: '001', text: 'Office Supplies' }]
    },
    'concept:plant': {
        kind: 'concept',
        id: 'plant',
        name: 'plant',
        valueKind: 'code',
        types: ['string'],
        values: ['1000']
    }
};

describe('value-bank store', () => {
    describe('given a well-formed store', () => {
        const parsed = parseValueBankStore(store(exampleBanks));

        it('then every bank shape is readable through its typed accessor', () => {
            expect(requiredRoleBankValues(parsed, 'currencies')).toEqual(['EUR', 'USD']);
            expect(requiredIntegerBankValues(parsed, 'field-control-values')).toEqual([0, 7]);
            expect(requiredPairBankValues(parsed, 'statuses')).toEqual([{ code: 'O', text: 'Open' }]);
            expect(requiredRecordBankValues(parsed, 'cities', { digits: 'integer', city: 'string' })).toEqual([
                { city: 'Berlin', digits: 7 }
            ]);
            expect(conceptValueBank(parsed, 'headcount')).toMatchObject({ range: { min: 1, max: 500, scale: 0 } });
            expect(conceptValueBank(parsed, 'purchasing-group')?.pairs).toHaveLength(1);
            expect(conceptValueBank(parsed, 'plant')?.values).toEqual(['1000']);
        });

        it('then role and concept namespaces stay apart', () => {
            expect(conceptValueBank(parsed, 'currencies')).toBeUndefined();
            expect(roleBankValues(parsed, 'plant')).toBeUndefined();
            // An integer or record bank is not a string bank.
            expect(roleBankValues(parsed, 'field-control-values')).toBeUndefined();
            expect(roleBankValues(parsed, 'cities')).toBeUndefined();
        });

        it('then a missing or differently shaped bank fails loudly', () => {
            expect(() => requiredRoleBankValues(parsed, 'products')).toThrow(/role:products/u);
            expect(() => requiredIntegerBankValues(parsed, 'currencies')).toThrow(/integer bank/u);
            expect(() => requiredPairBankValues(parsed, 'currencies')).toThrow(/code\/text bank/u);
            expect(() => requiredRecordBankValues(parsed, 'currencies', { code: 'string' })).toThrow(/record bank/u);
            expect(() => requiredRecordBankValues(parsed, 'cities', { city: 'string' })).toThrow(/fields/u);
        });

        it('then the parsed store is frozen', () => {
            expect(Object.isFrozen(requiredRoleBankValues(parsed, 'currencies'))).toBe(true);
            expect(
                Object.isFrozen(requiredRecordBankValues(parsed, 'cities', { city: 'string', digits: 'integer' })[0])
            ).toBe(true);
        });
    });

    describe('when the store violates its schema', () => {
        const role = exampleBanks['role:currencies'];
        const concept = exampleBanks['concept:plant'];
        it.each([
            ['a non-object document', [], /must be an object/u],
            ['an unknown top-level key', { ...store(exampleBanks), extra: true }, /unexpected keys: extra/u],
            ['another format', { ...store(exampleBanks), version: 2 }, /unsupported value-bank store format/u],
            ['no banks', store({}), /has no banks/u],
            ['a label that does not match', store({ 'role:money': role }), /must be labelled role:currencies/u],
            ['an unknown kind', store({ 'x:currencies': { ...role, kind: 'x' } }), /role or concept kind/u],
            ['an upper-case id', store({ 'role:Money': { ...role, id: 'Money' } }), /lower-case id/u],
            ['an unknown bank key', store({ 'role:currencies': { ...role, weight: 1 } }), /unexpected keys: weight/u],
            ['empty values', store({ 'role:currencies': { ...role, values: [] } }), /non-empty list/u],
            ['an empty string', store({ 'role:currencies': { ...role, values: [''] } }), /non-empty strings/u],
            [
                'an unsupported role kind',
                store({ 'role:currencies': { ...role, valueKind: 'number' } }),
                /unsupported role value kind/u
            ],
            [
                'a fractional integer',
                store({ 'role:n': { kind: 'role', id: 'n', valueKind: 'integer', values: [1.5] } }),
                /list of integers/u
            ],
            [
                'a pair without text',
                store({ 'role:s': { kind: 'role', id: 's', valueKind: 'code-text', pairs: [{ code: 'O' }] } }),
                /needs a non-empty code and text/u
            ],
            [
                'no pairs',
                store({ 'role:s': { kind: 'role', id: 's', valueKind: 'code-text', pairs: [] } }),
                /code\/text pairs/u
            ],
            [
                'a record with an extra field',
                store({
                    'role:c': {
                        kind: 'role',
                        id: 'c',
                        valueKind: 'record',
                        fields: { city: 'string' },
                        records: [{ city: 'Berlin', zip: '1' }]
                    }
                }),
                /unexpected keys: zip/u
            ],
            [
                'a record field of the wrong type',
                store({
                    'role:c': {
                        kind: 'role',
                        id: 'c',
                        valueKind: 'record',
                        fields: { digits: 'integer' },
                        records: [{ digits: '7' }]
                    }
                }),
                /digits must be an integer/u
            ],
            [
                'an empty record string',
                store({
                    'role:c': {
                        kind: 'role',
                        id: 'c',
                        valueKind: 'record',
                        fields: { city: 'string' },
                        records: [{ city: '' }]
                    }
                }),
                /city must be a non-empty string/u
            ],
            [
                'an unknown field type',
                store({
                    'role:c': { kind: 'role', id: 'c', valueKind: 'record', fields: { city: 'text' }, records: [{}] }
                }),
                /"string" or "integer"/u
            ],
            [
                'no records',
                store({
                    'role:c': { kind: 'role', id: 'c', valueKind: 'record', fields: { city: 'string' }, records: [] }
                }),
                /records must be a non-empty list/u
            ],
            ['a concept without a name', store({ 'concept:plant': { ...concept, name: '' } }), /needs a name/u],
            [
                'an unsupported concept kind',
                store({ 'concept:plant': { ...concept, valueKind: 'record' } }),
                /unsupported concept value kind/u
            ],
            ['a concept without types', store({ 'concept:plant': { ...concept, types: [] } }), /types/u],
            [
                'a concept with inverted range',
                store({
                    'concept:h': { ...exampleBanks['concept:headcount'], id: 'h', range: { min: 5, max: 1, scale: 0 } }
                }),
                /numeric range/u
            ],
            [
                'a concept range with extra keys',
                store({
                    'concept:h': {
                        ...exampleBanks['concept:headcount'],
                        id: 'h',
                        range: { min: 1, max: 5, scale: 0, step: 1 }
                    }
                }),
                /unexpected keys: step/u
            ],
            [
                'a concept with a key of another shape',
                store({ 'concept:plant': { ...concept, pairs: [] } }),
                /unexpected keys: pairs/u
            ]
        ])('then it rejects %s', (_case, document, message) => {
            expect(() => parseValueBankStore(document)).toThrow(message);
        });
    });

    it('accepts the example store documented in the README', () => {
        const readme = readFileSync(new URL('../../README.md', import.meta.url), 'utf8');
        const example = /### Value banks[\s\S]*?```json\n([\s\S]*?)```/u.exec(readme)?.[1];
        const parsed = parseValueBankStore(JSON.parse(example ?? 'null') as unknown);
        expect(requiredRecordBankValues(parsed, 'units', { code: 'string', iso: 'string', text: 'string' })).toEqual([
            { code: 'KG', iso: 'KGM', text: 'Kilogram' }
        ]);
        expect(conceptValueBank(parsed, 'plant')?.values).toEqual(['1000', '1010']);
    });

    describe('given the packaged store', () => {
        it('then the digest covers the exact bytes that were parsed', () => {
            const bytes = readFileSync(new URL(`../../${VALUE_BANK_STORE_PATH}`, import.meta.url));
            expect(VALUE_BANK_STORE_SHA256).toBe(createHash('sha256').update(bytes).digest('hex'));
            expect(SEMANTIC_CATALOG_FINGERPRINT).toBe(
                createHash('sha256')
                    .update(JSON.stringify({ version: SEMANTIC_CATALOG_VERSION, valueBanks: VALUE_BANK_STORE_SHA256 }))
                    .digest('hex')
            );
        });

        it('then units, their ISO codes and texts come from one record bank', () => {
            expect(UNITS).toEqual(UNIT_SAMPLES.map(({ code }) => code));
            expect(Object.entries(UNIT_ISO_CODES)).toEqual(UNIT_SAMPLES.map(({ code, iso }) => [code, iso]));
            expect(UNIT_ISO_CODES.KG).toBe('KGM');
        });

        it('then locations keep their coherent fields together', () => {
            for (const location of LOCATIONS) {
                expect(typeof location.city).toBe('string');
                expect(Number.isSafeInteger(location.phoneSubscriberDigits)).toBe(true);
            }
            expect(CURRENCIES).toContain('EUR');
            expect(STATUS_SAMPLES.length).toBeGreaterThan(0);
            expect(FIELD_CONTROL_VALUES.every((value) => Number.isSafeInteger(value))).toBe(true);
        });

        it('then the default sample dataset keeps its identity and reads the name banks', () => {
            expect(DEFAULT_SAMPLE_DATASET).toMatchObject({ id: 'offline-text-samples', version: '1' });
            expect(DEFAULT_SAMPLE_DATASET.firstNames).toBe(requiredRoleBankValues(VALUE_BANKS, 'first-names'));
            expect(DEFAULT_SAMPLE_DATASET).not.toHaveProperty('roleSamples');
        });

        it('then role samples are addressed by role name and concepts by concept id', () => {
            expect(roleSamples('language')).toContain('EN');
            expect(roleSamples('no_such_role')).toBeUndefined();
            const concepts = [...VALUE_BANKS.banks.values()].filter((bank) => bank.kind === 'concept');
            expect(concepts.length).toBeGreaterThan(0);
            expect(packagedConceptBank(concepts[0].id)).toBe(concepts[0]);
        });
    });
});

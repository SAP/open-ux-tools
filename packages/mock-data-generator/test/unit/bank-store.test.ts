import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {
    packagedBanks,
    VALUE_BANK_STORE_PATH,
    conceptValueBank,
    isIbanCountry,
    packagedConceptBank,
    parseValueBankStore,
    requiredIntegerBankValues,
    requiredPairBankValues,
    requiredRecordBankValues,
    requiredRoleBankValues,
    roleBankValues,
    roleSamples
} from '../../src/semantics/bank-store.js';
import { currencyFractionDigits } from '../../src/generation/coherence.js';
import { semanticCatalogFingerprint, SEMANTIC_CATALOG_VERSION } from '../../src/semantics/value-banks.js';

const store = (banks: Record<string, unknown>) => ({
    format: 'mockgen-value-banks',
    version: 2,
    sampleDataset: { id: 'test-samples', version: '1' },
    banks
});

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
            ['another format', { ...store(exampleBanks), version: 1 }, /unsupported value-bank store format/u],
            [
                'a sample dataset without a version',
                { ...store(exampleBanks), sampleDataset: { id: 'samples' } },
                /sampleDataset version must be a non-empty string/u
            ],
            [
                'a sample dataset with an extra key',
                { ...store(exampleBanks), sampleDataset: { id: 'samples', version: '1', source: 'x' } },
                /sampleDataset has unexpected keys: source/u
            ],
            [
                'a record number that is not finite',
                store({
                    'role:r': {
                        kind: 'role',
                        id: 'r',
                        valueKind: 'record',
                        fields: { minimum: 'number' },
                        records: [{ minimum: '1.5' }]
                    }
                }),
                /minimum must be a finite number/u
            ],
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
                /"string", "integer" or "number"/u
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

    describe('given the packaged store', () => {
        it('then the digest covers the exact bytes that were parsed', () => {
            const bytes = readFileSync(new URL(`../../${VALUE_BANK_STORE_PATH}`, import.meta.url));
            expect(packagedBanks().sha256).toBe(createHash('sha256').update(bytes).digest('hex'));
            expect(semanticCatalogFingerprint()).toBe(
                createHash('sha256')
                    .update(JSON.stringify({ version: SEMANTIC_CATALOG_VERSION, valueBanks: packagedBanks().sha256 }))
                    .digest('hex')
            );
        });

        it('then units, their ISO codes and texts come from one record bank', () => {
            expect(packagedBanks().units).toEqual(packagedBanks().unitSamples.map(({ code }) => code));
            expect(Object.entries(packagedBanks().unitIsoCodes)).toEqual(
                packagedBanks().unitSamples.map(({ code, iso }) => [code, iso])
            );
            expect(packagedBanks().unitIsoCodes.KG).toBe('KGM');
        });

        it('then units carry the display decimals and SI conversions the generator used before', () => {
            // Given the unit records
            const decimals = Object.fromEntries(
                packagedBanks().unitSamples.map(({ code, decimals: digits }) => [code, digits])
            );
            const conversions = packagedBanks()
                .unitSamples.filter(({ toBaseNumerator }) => toBaseNumerator !== undefined)
                .map(({ code, toBaseNumerator, toBaseDenominator }) => [code, toBaseNumerator, toBaseDenominator]);
            // Then they hold the values of the former in-code tables
            expect(decimals).toEqual({ EA: 0, PC: 0, KG: 3, L: 3, M: 3, H: 2, S: 0, MIN: 0, D: 0, WK: 0 });
            expect(conversions).toEqual([
                ['L', 1, 1_000],
                ['H', 3_600, 1],
                ['MIN', 60, 1]
            ]);
        });

        it('then ISO 4217 records keep the former numeric codes and minor units', () => {
            // Given the ISO 4217 records
            const byCode = new Map(packagedBanks().iso4217Currencies.map((record) => [record.code, record]));
            // Then every generated currency has its numeric code and no other record has one
            expect(
                Object.fromEntries(
                    packagedBanks()
                        .iso4217Currencies.filter(({ numeric }) => numeric !== undefined)
                        .map(({ code, numeric }) => [code, numeric])
                )
            ).toEqual({
                AUD: '036',
                BRL: '986',
                CAD: '124',
                CHF: '756',
                CNY: '156',
                CZK: '203',
                DKK: '208',
                EUR: '978',
                GBP: '826',
                HKD: '344',
                INR: '356',
                JPY: '392',
                MXN: '484',
                NOK: '578',
                NZD: '554',
                PLN: '985',
                SEK: '752',
                SGD: '702',
                USD: '840',
                ZAR: '710'
            });
            expect([...packagedBanks().currencies].sort()).toEqual(
                packagedBanks()
                    .iso4217Currencies.filter(({ numeric }) => numeric !== undefined)
                    .map(({ code }) => code)
            );
            // And the minor units follow SIX List One: 0, 3 and 4 digits, none for metals and testing codes
            expect(byCode.get('JPY')?.minorUnits).toBe(0);
            expect(byCode.get('KWD')?.minorUnits).toBe(3);
            expect(byCode.get('CLF')?.minorUnits).toBe(4);
            expect(byCode.has('XAU')).toBe(true);
            expect(byCode.get('XAU')?.minorUnits).toBeUndefined();
            expect(byCode.get('EUR')?.minorUnits).toBe(2);
            expect(packagedBanks().iso4217Currencies.filter(({ minorUnits }) => minorUnits === undefined)).toHaveLength(
                13
            );
        });

        it('then currency fraction digits match the former exception tables', () => {
            // Given the former SIX exception tables
            const zero = ['BIF', 'CLP', 'DJF', 'GNF', 'ISK', 'JPY', 'KMF', 'KRW', 'PYG', 'RWF', 'UGX', 'UYI', 'VND'];
            const zeroMore = ['VUV', 'XAF', 'XOF', 'XPF'];
            const three = ['BHD', 'IQD', 'JOD', 'KWD', 'LYD', 'OMR', 'TND'];
            const four = ['CLF', 'UYW'];
            const none = ['XAG', 'XAU', 'XBA', 'XBB', 'XBC', 'XBD', 'XDR', 'XPD', 'XPT', 'XSU', 'XTS', 'XUA', 'XXX'];
            // Then the store-backed lookup returns the same digits, and two for any other code
            [...zero, ...zeroMore].forEach((code) => expect(currencyFractionDigits(code)).toBe(0));
            three.forEach((code) => expect(currencyFractionDigits(code)).toBe(3));
            four.forEach((code) => expect(currencyFractionDigits(code)).toBe(4));
            none.forEach((code) => expect(currencyFractionDigits(code)).toBeUndefined());
            ['EUR', 'USD', 'GBP', 'ZZZ', 'constructor'].forEach((code) => expect(currencyFractionDigits(code)).toBe(2));
        });

        it('then IBAN formats keep the former lengths and bank parts', () => {
            // Given the IBAN format records
            const formats = Object.fromEntries(
                Object.entries(packagedBanks().ibanFormats).map(([country, { length, bbanTemplate }]) => [
                    country,
                    [length, bbanTemplate.replaceAll('#', ''), bbanTemplate.split('#').length - 1]
                ])
            );
            // Then each holds the former length, fixed bank part and account digit count
            expect(formats).toEqual({
                CZ: [24, '0800', 16],
                DE: [22, '37040044', 10],
                IE: [22, 'BOFI900017', 8],
                IT: [27, 'X0542811101', 12]
            });
            expect(['CZ', 'DE', 'IE', 'IT', 'FR', 'constructor', 1].map(isIbanCountry)).toEqual([
                true,
                true,
                true,
                true,
                false,
                false,
                false
            ]);
        });

        it('then numeric roles keep the former value ranges', () => {
            // Given the numeric role ranges
            const ranges = Object.fromEntries(
                [...packagedBanks().numericRoleRanges].map(([role, { minimum, maximum }]) => [role, [minimum, maximum]])
            );
            // Then they hold the bounds of the former switch
            expect(ranges).toEqual({
                exponent: [-6, 6],
                count: [1, 500],
                conversion_factor: [1, 100],
                conversion_offset: [-10, 10],
                monetary_amount: [100, 9_099.99],
                price: [5, 500],
                duration: [1, 15],
                quantity: [1, 90.99],
                distance: [1, 5_000],
                rating: [1, 5],
                percentage: [0, 100],
                interest_rate: [0, 20],
                temperature: [-30, 50],
                pressure: [0.5, 20]
            });
        });

        it('then locations keep their coherent fields together', () => {
            for (const location of packagedBanks().locations) {
                expect(typeof location.city).toBe('string');
                expect(Number.isSafeInteger(location.phoneSubscriberDigits)).toBe(true);
            }
            expect(packagedBanks().currencies).toContain('EUR');
            expect(packagedBanks().statusSamples.length).toBeGreaterThan(0);
            expect(packagedBanks().fieldControlValues.every((value) => Number.isSafeInteger(value))).toBe(true);
        });

        it('then the default sample dataset keeps its identity and reads the name banks', () => {
            expect(packagedBanks().store.sampleDataset).toEqual({ id: 'offline-text-samples', version: '1' });
            expect(packagedBanks().defaultSampleDataset).toMatchObject({ id: 'offline-text-samples', version: '1' });
            expect(packagedBanks().defaultSampleDataset.firstNames).toBe(
                requiredRoleBankValues(packagedBanks().store, 'first-names')
            );
            expect(packagedBanks().defaultSampleDataset).not.toHaveProperty('roleSamples');
        });

        it('then role samples are addressed by role name and concepts by concept id', () => {
            expect(roleSamples('language')).toContain('EN');
            expect(roleSamples('no_such_role')).toBeUndefined();
            const concepts = [...packagedBanks().store.banks.values()].filter((bank) => bank.kind === 'concept');
            expect(concepts.length).toBeGreaterThan(0);
            expect(packagedConceptBank(concepts[0].id)).toBe(concepts[0]);
        });
    });
});

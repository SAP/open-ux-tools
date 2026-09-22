import { propertyValueIsValid } from '../../src/generation/constraints.js';
import { generateService, type SftGenerator } from '../../src/index.js';
import type { SchemaProperty } from '../../src/schema/graph.js';

const finiteCsn = JSON.stringify({
    definitions: {
        'Demo.Status': { kind: 'type', type: 'cds.String', enum: { Open: { val: 'O' }, Closed: { val: 'C' } } },
        'Demo.Finite': {
            kind: 'entity',
            elements: {
                status: { key: true, type: 'Demo.Status', notNull: true },
                active: { key: true, type: 'cds.Boolean', notNull: true },
                ratio: { type: 'cds.Decimal', precision: 3, scale: 2, notNull: true }
            }
        }
    }
});

describe('whole-service constraints', () => {
    test('reduces an unsatisfiable finite composite-key domain and emits only unique valid rows', async () => {
        const result = await generateService(
            {
                metadata: { format: 'csn', content: finiteCsn },
                service: { urlPath: '/finite', odataVersion: '4.0' },
                targets: [{ name: 'Finite', kind: 'entity-set' }],
                existingData: {}
            },
            { rowsPerEntity: 10, seed: 9 }
        );

        expect(result.resources.Finite).toHaveLength(4);
        expect(new Set(result.resources.Finite?.map((row) => `${row.status}:${row.active}`))).toHaveProperty('size', 4);
        expect(
            result.resources.Finite?.every((row) => typeof row.ratio === 'number' && Math.abs(row.ratio as number) < 10)
        ).toBe(true);
        expect(result.diagnostics).toContainEqual(
            expect.objectContaining({
                code: 'ROW_COUNT_REDUCED_UNSATISFIABLE_KEY_DOMAIN',
                target: 'Finite'
            })
        );
    });

    test('rejects off-enum SFT values through the shared constraint validation path', async () => {
        const sft: SftGenerator = {
            fingerprint: 'sft-test',
            generate: jest.fn(async () => ({
                rows: [{ opaqueState: 'NOT_ALLOWED' }, { opaqueState: 'ALSO_BAD' }]
            }))
        };
        const csn = JSON.stringify({
            definitions: {
                'Demo.Status': {
                    kind: 'type',
                    type: 'cds.String',
                    enum: { Open: { val: 'O' }, Closed: { val: 'C' } }
                },
                'Demo.Record': {
                    kind: 'entity',
                    elements: {
                        ID: { key: true, type: 'cds.Integer', notNull: true },
                        opaqueState: { type: 'Demo.Status', notNull: true }
                    }
                }
            }
        });

        const result = await generateService(
            {
                metadata: { format: 'csn', content: csn },
                service: { urlPath: '/records', odataVersion: '4.0' },
                targets: [{ name: 'Record', kind: 'entity-set' }],
                existingData: {}
            },
            { rowsPerEntity: 2 },
            { sft }
        );

        expect(result.resources.Record?.map((row) => row.opaqueState)).toEqual(['O', 'C']);
    });

    test('rejects calendar-invalid date and timestamp SFT values', async () => {
        const sft: SftGenerator = {
            fingerprint: 'sft-calendar-test',
            generate: jest.fn(async () => ({
                rows: [{ businessDate: '2024-02-31', changedAt: '2024-02-31T10:00:00Z' }]
            }))
        };
        const csn = JSON.stringify({
            definitions: {
                'Demo.Record': {
                    kind: 'entity',
                    elements: {
                        ID: { key: true, type: 'cds.Integer', notNull: true },
                        businessDate: { type: 'cds.Date', notNull: true },
                        changedAt: { type: 'cds.Timestamp', notNull: true }
                    }
                }
            }
        });

        const result = await generateService(
            {
                metadata: { format: 'csn', content: csn },
                service: { urlPath: '/records', odataVersion: '4.0' },
                targets: [{ name: 'Record', kind: 'entity-set' }],
                existingData: {}
            },
            { rowsPerEntity: 1 },
            { sft }
        );

        expect(result.resources.Record?.[0].businessDate).not.toBe('2024-02-31');
        expect(result.resources.Record?.[0].changedAt).not.toBe('2024-02-31T10:00:00Z');
    });

    test('requires an explicit timezone for DateTimeOffset but not DateTime', () => {
        const base: Omit<SchemaProperty, 'primitiveType'> = {
            name: 'ChangedAt',
            nullable: false,
            isKey: false,
            annotations: []
        };

        expect(propertyValueIsValid({ ...base, primitiveType: 'datetime' }, '2026-09-04T12:00:00')).toBe(true);
        expect(propertyValueIsValid({ ...base, primitiveType: 'datetimeoffset' }, '2026-09-04T12:00:00')).toBe(false);
        expect(propertyValueIsValid({ ...base, primitiveType: 'datetimeoffset' }, '2026-09-04T12:00:00Z')).toBe(true);
        expect(propertyValueIsValid({ ...base, primitiveType: 'datetimeoffset' }, '2026-09-04T12:00:00+05:30')).toBe(
            true
        );
    });

    test('preserves unsigned-byte bounds for validation, values, and key cardinality', async () => {
        const byteProperty: SchemaProperty = {
            name: 'ByteValue',
            primitiveType: 'int',
            nullable: false,
            isKey: false,
            numericMinimum: 0,
            numericMaximum: 255,
            annotations: []
        };
        expect(propertyValueIsValid(byteProperty, -1)).toBe(false);
        expect(propertyValueIsValid(byteProperty, 0)).toBe(true);
        expect(propertyValueIsValid(byteProperty, 255)).toBe(true);
        expect(propertyValueIsValid(byteProperty, 256)).toBe(false);

        const result = await generateService(
            {
                metadata: {
                    format: 'csn',
                    content: JSON.stringify({
                        definitions: {
                            'Demo.ByteRecord': {
                                kind: 'entity',
                                elements: {
                                    ID: { key: true, notNull: true, type: 'cds.UInt8' },
                                    OpaqueValue: { type: 'cds.UInt8' }
                                }
                            }
                        }
                    })
                },
                service: { urlPath: '/byte-records', odataVersion: '4.0' },
                targets: [{ name: 'ByteRecord', kind: 'entity-set' }],
                existingData: {}
            },
            { rowsPerEntity: 300, seed: 91 }
        );

        expect(result.resources.ByteRecord).toHaveLength(255);
        expect(result.resources.ByteRecord.every(({ ID }) => Number(ID) >= 1 && Number(ID) <= 255)).toBe(true);
        expect(result.resources.ByteRecord.every(({ OpaqueValue }) => Number(OpaqueValue) <= 255)).toBe(true);
        expect(result.diagnostics).toContainEqual(
            expect.objectContaining({ code: 'ROW_COUNT_REDUCED_UNSATISFIABLE_KEY_DOMAIN', target: 'ByteRecord' })
        );
    });

    test.each([
        ['date', { type: 'cds.Date' }],
        ['datetimeoffset', { type: 'cds.Timestamp' }],
        ['time', { type: 'cds.Time' }],
        ['decimal', { type: 'cds.Decimal', precision: 4, scale: 2 }],
        ['binary', { type: 'cds.Binary', length: 8 }],
        ['unbounded string', { type: 'cds.String' }]
    ])('emits 1000 unique valid %s keys', async (_label, keyDefinition) => {
        const result = await generateService(
            {
                metadata: {
                    format: 'csn',
                    content: JSON.stringify({
                        definitions: {
                            'Demo.Record': {
                                kind: 'entity',
                                elements: {
                                    ID: { key: true, notNull: true, ...keyDefinition },
                                    value: { type: 'cds.String', length: 20 }
                                }
                            }
                        }
                    })
                },
                service: { urlPath: '/records', odataVersion: '4.0' },
                targets: [{ name: 'Record', kind: 'entity-set' }],
                existingData: {}
            },
            { rowsPerEntity: 1_000, seed: 91 }
        );
        const keys = result.resources.Record.map(({ ID }) => JSON.stringify(ID));

        expect(keys).toHaveLength(1_000);
        expect(new Set(keys)).toHaveProperty('size', 1_000);
    });

    test.each([
        [1, 10, 11, true],
        [2, 100, 101, true],
        [3, 1_000, 1_000, false]
    ])(
        'uses the actual numeric SAP key capacity for a Customer key of length %i',
        async (length, capacity, requestedRows, isReduced) => {
            const result = await generateService(
                {
                    metadata: {
                        format: 'csn',
                        content: JSON.stringify({
                            definitions: {
                                'Demo.CustomerRecord': {
                                    kind: 'entity',
                                    elements: {
                                        Customer: { key: true, notNull: true, type: 'cds.String', length },
                                        value: { type: 'cds.String', length: 20 }
                                    }
                                }
                            }
                        })
                    },
                    service: { urlPath: '/customer-records', odataVersion: '4.0' },
                    targets: [{ name: 'CustomerRecord', kind: 'entity-set' }],
                    existingData: {}
                },
                { rowsPerEntity: requestedRows, seed: 91 }
            );
            const keys = result.resources.CustomerRecord.map(({ Customer }) => String(Customer));

            expect(keys).toHaveLength(capacity);
            expect(new Set(keys)).toHaveProperty('size', capacity);
            expect(keys.every((key) => key.length === length && /^\d+$/u.test(key))).toBe(true);
            const reduction = result.diagnostics.find(
                ({ code, target }) =>
                    code === 'ROW_COUNT_REDUCED_UNSATISFIABLE_KEY_DOMAIN' && target === 'CustomerRecord'
            );
            expect(Boolean(reduction)).toBe(isReduced);
        }
    );

    test.each([1, 2, 3])('keeps a Serial key unique at its governed length-%i boundary', async (length) => {
        const result = await generateService(
            {
                metadata: {
                    format: 'csn',
                    content: JSON.stringify({
                        definitions: {
                            'Demo.SerialRecord': {
                                kind: 'entity',
                                elements: {
                                    SerialNumber: { key: true, notNull: true, type: 'cds.String', length }
                                }
                            }
                        }
                    })
                },
                service: { urlPath: '/serial-records', odataVersion: '4.0' },
                targets: [{ name: 'SerialRecord', kind: 'entity-set' }],
                existingData: {}
            },
            { rowsPerEntity: 37, seed: 91 }
        );
        const keys = result.resources.SerialRecord.map(({ SerialNumber }) => String(SerialNumber));
        const expectedCapacity = 36;

        expect(keys).toHaveLength(expectedCapacity);
        expect(new Set(keys)).toHaveProperty('size', expectedCapacity);
        expect(keys.every((key) => key.length === length)).toBe(true);
        expect(result.diagnostics).toContainEqual(
            expect.objectContaining({ code: 'ROW_COUNT_REDUCED_UNSATISFIABLE_KEY_DOMAIN', target: 'SerialRecord' })
        );
    });
});

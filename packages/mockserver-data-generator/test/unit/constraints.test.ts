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
});

import { rebuildContexts, rebuildFieldContext } from '../../training/common/field-context.mjs';
import { serializeFieldContextV3 } from '../../training/common/runtime.mjs';
import { buildRoleHeadPartitions } from '../../training/role-head/partitions.mjs';

const fieldContext = (service, property, primitiveType = 'string') => ({
    field_id: `property:${service}/Orders/${property}`,
    entity_type: 'Orders',
    property,
    primitive_type: primitiveType,
    facets: { isKey: false, maxLength: 10, nullable: true, precision: null, scale: null },
    neighbors: ['OrderId', 'Status']
});
/**
 * The published text of a field: its rebuilt context serialized, as the dataset publishes it.
 * @param {object} record `field_contexts` record
 * @returns {string} the text
 */
const textOf = (record) => serializeFieldContextV3(rebuildFieldContext(record, ''));

/**
 * A `rows_head_a` record and its `field_contexts` record.
 * @param {{ service: string, family: string, property: string, label: string, split: string, pool?: string }} options row options
 * @returns {{ row: object, record: object }} the pair
 */
function published({ service, family, property, label, split, pool = 'synthetic' }) {
    const record = fieldContext(service, property);
    return {
        record,
        row: { field_id: record.field_id, service_id: service, family, label, split, pool, text: textOf(record) }
    };
}

const fixtures = [
    published({ service: 's1', family: 'f1', property: 'Status', label: 'status', split: 'train' }),
    published({ service: 's1', family: 'f1', property: 'Opaque', label: 'unknown', split: 'train' }),
    published({ service: 's1', family: 'f1', property: 'EMail', label: 'email', split: 'train' }),
    published({ service: 's2', family: 'f2', property: 'LifecycleStatus', label: 'status', split: 'calibration' }),
    published({
        service: 's2',
        family: 'f2',
        property: 'BankInternal',
        label: 'bank_account_internal_id',
        split: 'calibration'
    }),
    published({ service: 's2', family: 'f2', property: 'City', label: 'city', split: 'calibration' }),
    published({
        service: 's3',
        family: 'f3',
        property: 'Harvested',
        label: 'status',
        split: 'train',
        pool: 'public-harvest-2026-09'
    })
];
const fieldContexts = new Map(fixtures.map(({ record }) => [record.field_id, record]));
const rows = fixtures.map(({ row }) => row);

describe('rebuildFieldContext', () => {
    test('reads label, data element and description back from the published text', () => {
        // Given a record and a text that carries all three
        const record = fieldContext('s1', 'Status');
        const base = textOf(record).split('; ');
        const text = [base[0], 'label Order status', 'data element STATUS', 'Lifecycle of the order', base.at(-1)].join(
            '; '
        );
        // When rebuilt
        const context = rebuildFieldContext(record, text);
        // Then the parts land in their fields and the context re-serializes to the same text
        expect(context).toMatchObject({
            label: 'Order status',
            dataElement: 'STATUS',
            description: 'Lifecycle of the order'
        });
        expect(serializeFieldContextV3(context)).toBe(text);
    });

    test('reports rows that do not re-serialize to their published text', () => {
        // Given one good row and one with a tampered text
        const [good] = rows;
        const { contexts, unrebuildable } = rebuildContexts(
            [good, { ...good, field_id: 'missing', text: 'x' }],
            fieldContexts
        );
        // Then only the good row is rebuilt
        expect([...contexts.keys()]).toEqual([good.field_id]);
        expect(unrebuildable).toEqual(['missing']);
    });
});

describe('buildRoleHeadPartitions', () => {
    test('applies the shipped recipe: no harvest, no excluded label, no label unseen in train', () => {
        // Given train, calibration and harvest rows
        // When partitioned
        const { records, trainIds, calibrationIds, report } = buildRoleHeadPartitions({ rows, fieldContexts });
        // Then harvest and the excluded calibration label are gone, and city (absent from train) is dropped
        expect(trainIds).toEqual(rows.slice(0, 3).map((row) => row.field_id));
        expect(calibrationIds).toEqual([rows[3].field_id]);
        expect(report).toMatchObject({
            excludedPoolRows: 1,
            excludedCalibrationLabelRows: 1,
            calibrationLabelAbsentFromTrainRows: 1,
            train: 3,
            calibration: 1
        });
        expect(records[0]).toMatchObject({ group: 's1', family: 'f1', service: 's1', label: 'status' });
        expect(records[0].context.inputFormat).toBe('v3');
    });

    test('drops conflicting texts and refuses shared services, shared text and missing unknown', () => {
        // Given the same text labelled two ways in train, then both rows are dropped
        const copy = { ...fieldContexts.get(rows[0].field_id), field_id: 'property:s1/Orders/StatusCopy' };
        const conflicting = [...rows, { ...rows[0], field_id: copy.field_id, label: 'email' }];
        const withCopy = new Map(fieldContexts).set(copy.field_id, copy);
        const result = buildRoleHeadPartitions({ rows: conflicting, fieldContexts: withCopy });
        expect(result.report.conflictingLabelRows).toBe(2);
        expect(result.trainIds).not.toContain(rows[0].field_id);
        // Given a calibration row from a train service, then partitioning refuses
        const leaking = rows.map((row, index) => (index === 3 ? { ...row, service_id: 's1' } : row));
        expect(() => buildRoleHeadPartitions({ rows: leaking, fieldContexts })).toThrow(/share a service/u);
        // Given no unknown in train, then partitioning refuses
        const noUnknown = rows.filter((row) => row.label !== 'unknown');
        expect(() => buildRoleHeadPartitions({ rows: noUnknown, fieldContexts })).toThrow(/unknown/u);
        // Given a tampered text, then partitioning refuses
        const tampered = rows.map((row, index) => (index === 0 ? { ...row, text: 'other' } : row));
        expect(() => buildRoleHeadPartitions({ rows: tampered, fieldContexts })).toThrow(/re-serialize/u);
    });
});

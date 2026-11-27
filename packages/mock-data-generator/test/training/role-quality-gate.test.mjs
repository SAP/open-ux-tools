import { evaluateRoleQualityGate } from '../../training/role-head/role-quality-gate.mjs';

const qualifiedFields = () =>
    Array.from({ length: 30 }, (_item, index) => ({
        id: `field-${index}`,
        serviceId: `service-${index % 4}`,
        domain: index % 2 === 0 ? 'travel' : 'finance',
        expectedRole: 'status',
        acceptedRole: 'status',
        supported: true,
        decisiveMetadata: false,
        unannotatedStatus: true,
        criticalFalsePositive: false
    }));

describe('evaluateRoleQualityGate', () => {
    test('passes a broad status sample with strong routing', () => {
        // Given 30 correct status fields over 4 services and 2 domains
        // When the gate runs
        const result = evaluateRoleQualityGate(qualifiedFields());
        // Then it passes with perfect metrics and counts the sample breadth
        expect(result.pass).toBe(true);
        expect(result.metrics).toMatchObject({
            acceptedPrecision: 1,
            supportedRecall: 1,
            statusRecall: 1,
            statusFields: 30,
            statusServices: 4,
            statusDomains: 2
        });
    });

    test('fails a tiny or single-domain status set even at perfect accuracy', () => {
        // Given too few fields, or one domain only
        const oneDomain = qualifiedFields().map((row) => ({ ...row, domain: 'travel' }));
        // Then the sample-size rule fails both
        expect(evaluateRoleQualityGate(qualifiedFields().slice(0, 6)).failures.join(' ')).toMatch(/status sample/u);
        expect(evaluateRoleQualityGate(oneDomain).failures.join(' ')).toMatch(/status sample/u);
    });

    test('reports precision, supported recall and status recall independently', () => {
        // Given 2 wrong and 8 abstained decisions out of 30
        const fields = qualifiedFields();
        fields[0].acceptedRole = 'email';
        fields[1].acceptedRole = 'email';
        for (let index = 2; index < 10; index += 1) {
            fields[index].acceptedRole = null;
        }
        // When the gate runs
        const result = evaluateRoleQualityGate(fields);
        // Then only precision (20/22) is below its floor
        expect(result.metrics.acceptedPrecision).toBe(20 / 22);
        expect(result.metrics.supportedRecall).toBe(20 / 30);
        expect(result.metrics.statusRecall).toBe(20 / 30);
        expect(result.failures).toEqual(['accepted precision below 95%']);
    });

    test('rejects a critical false-positive rate above budget and duplicate fields', () => {
        // Given one critical false positive in 30 accepted decisions (3.3% > 3%)
        const fields = qualifiedFields();
        fields[0].criticalFalsePositive = true;
        expect(evaluateRoleQualityGate(fields).failures.join(' ')).toMatch(/critical false-positive rate/u);
        // Given a duplicated field id in one service, then the gate refuses
        fields[1].id = fields[0].id;
        fields[1].serviceId = fields[0].serviceId;
        expect(() => evaluateRoleQualityGate(fields)).toThrow(/duplicate reviewed field/u);
    });

    test('no accepted decisions is zero precision, and unknown is an abstention', () => {
        // Given every field abstained
        const none = evaluateRoleQualityGate(qualifiedFields().map((row) => ({ ...row, acceptedRole: null })));
        // Then precision is 0 and the gate fails
        expect(none.metrics.acceptedPrecision).toBe(0);
        expect(none.pass).toBe(false);
        // Given every field predicted unknown, then nothing counts as accepted
        const unknown = evaluateRoleQualityGate(qualifiedFields().map((row) => ({ ...row, acceptedRole: 'unknown' })));
        expect(unknown.metrics.acceptedFields).toBe(0);
        expect(unknown.metrics.supportedRecall).toBe(0);
    });
});

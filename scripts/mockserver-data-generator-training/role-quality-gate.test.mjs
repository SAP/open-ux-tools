import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluateRoleQualityGate } from './lib/role-quality-gate.mjs';

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

test('passes only a sufficiently broad reviewed status sample with strong routing', () => {
    const result = evaluateRoleQualityGate(qualifiedFields());
    assert.equal(result.pass, true);
    assert.equal(result.metrics.acceptedPrecision, 1);
    assert.equal(result.metrics.supportedRecall, 1);
    assert.equal(result.metrics.statusRecall, 1);
    assert.equal(result.metrics.statusFields, 30);
    assert.equal(result.metrics.statusServices, 4);
    assert.equal(result.metrics.statusDomains, 2);
});

test('a tiny or single-domain status set fails even at perfect accuracy', () => {
    assert.match(evaluateRoleQualityGate(qualifiedFields().slice(0, 6)).failures.join(' '), /status sample/u);
    const oneDomain = qualifiedFields().map((row) => ({ ...row, domain: 'travel' }));
    assert.match(evaluateRoleQualityGate(oneDomain).failures.join(' '), /status sample/u);
});

test('reports precision, supported recall and status recall independently', () => {
    const fields = qualifiedFields();
    fields[0].acceptedRole = 'email';
    fields[1].acceptedRole = 'email';
    for (let index = 2; index < 10; index += 1) fields[index].acceptedRole = null;
    const result = evaluateRoleQualityGate(fields);
    assert.equal(result.metrics.acceptedPrecision, 20 / 22);
    assert.equal(result.metrics.supportedRecall, 20 / 30);
    assert.equal(result.metrics.statusRecall, 20 / 30);
    // 20/30 recall clears the 0.60 floors; only precision fails at 20/22.
    assert.deepEqual(result.failures.sort(), ['accepted precision below 95%']);
});

test('rejects a critical false-positive rate above the budget and duplicate reviewed fields', () => {
    const fields = qualifiedFields();
    // The gate is a rate over accepted decisions: one bad decision in 30 is 3.3%, above the 3% budget.
    fields[0].criticalFalsePositive = true;
    assert.match(evaluateRoleQualityGate(fields).failures.join(' '), /critical false-positive rate/u);
    fields[1].id = fields[0].id;
    fields[1].serviceId = fields[0].serviceId;
    assert.throws(() => evaluateRoleQualityGate(fields), /duplicate reviewed field/u);
});

test('absence of any accepted detections cannot masquerade as perfect precision', () => {
    const fields = qualifiedFields().map((row) => ({ ...row, acceptedRole: null }));
    const result = evaluateRoleQualityGate(fields);
    assert.equal(result.metrics.acceptedPrecision, 0);
    assert.equal(result.pass, false);
});

test('raw unknown predictions remain abstentions, not accepted role decisions', () => {
    const result = evaluateRoleQualityGate(qualifiedFields().map((row) => ({ ...row, acceptedRole: 'unknown' })));
    assert.equal(result.metrics.acceptedFields, 0);
    assert.equal(result.metrics.supportedRecall, 0);
});

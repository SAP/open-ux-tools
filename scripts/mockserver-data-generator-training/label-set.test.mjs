import assert from 'node:assert/strict';
import { test } from 'node:test';
import { selectClaimableLabels } from './lib/label-set.mjs';

const registryRoles = {
    status: { family: 'status' },
    approval_status: { family: 'status' },
    email: { family: 'contact' },
    city: { family: 'location' }
};

test('claims labels with enough calibration support and blocks on unclaimable sealed status roles', () => {
    const decision = selectClaimableLabels({
        trainLabels: { status: 40, approval_status: 6, email: 20, city: 3, unknown: 50 },
        calibrationLabels: { status: 12, approval_status: 2, email: 12, unknown: 12 },
        sealedLabels: { status: 30, approval_status: 4, unknown: 20 },
        registryRoles
    });
    assert.deepEqual(decision.claimed, ['email', 'status', 'unknown']);
    assert.ok(decision.dropped.some((entry) => entry.label === 'approval_status'));
    assert.ok(decision.dropped.some((entry) => entry.label === 'city'));
    assert.equal(decision.blockers.length, 1);
});

test('family floor counts only roles that pass the role floor, and withdrawn labels are dropped first', () => {
    const roles = {
        ...registryRoles,
        datetime: { family: 'temporal' },
        date: { family: 'temporal' },
        time: { family: 'temporal' }
    };
    // Temporal family: datetime 7 rows passes the role floor, date and time (1 each) do not, so the
    // family reaches only 7, not 9, and datetime cannot be claimed.
    const decision = selectClaimableLabels({
        trainLabels: { datetime: 20, date: 5, time: 4, email: 20, status: 40, unknown: 50 },
        calibrationLabels: { datetime: 7, date: 1, time: 1, email: 12, status: 30, unknown: 12 },
        sealedLabels: {},
        registryRoles: roles,
        unclaimed: ['email']
    });
    assert.deepEqual(decision.claimed, ['status', 'unknown']);
    assert.match(decision.dropped.find((entry) => entry.label === 'datetime').reason, /family temporal rows 7 < 10/u);
    assert.match(decision.dropped.find((entry) => entry.label === 'email').reason, /withdrawn/u);
});

test('family floor is applied across the status family', () => {
    const decision = selectClaimableLabels({
        trainLabels: { status: 10, unknown: 10 },
        calibrationLabels: { status: 6, unknown: 3 },
        sealedLabels: {},
        registryRoles
    });
    assert.deepEqual(decision.claimed, ['unknown']);
    assert.match(decision.dropped[0].reason, /family status rows 6 < 10/u);
});

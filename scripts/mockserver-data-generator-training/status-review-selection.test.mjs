import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    eligibleAuthorizedStatusTrainingServices,
    eligiblePublicStatusHoldoutServices,
    eligiblePublicStatusServices
} from './lib/status-review-selection.mjs';

test('selects only public, parsable holdout services with status-named properties for offline review', () => {
    const registry = {
        services: [
            { id: 'travel', source: { format: 'csn' }, license: { identifier: 'Apache-2.0', redistributable: true } },
            { id: 'finance', source: { format: 'edmx' }, license: { identifier: 'MIT', redistributable: true } },
            { id: 'internal', source: { format: 'edmx' }, license: { redistributable: false } },
            { id: 'openapi', source: { format: 'openapi' }, license: { identifier: 'MIT', redistributable: true } },
            { id: 'train', source: { format: 'csn' }, license: { identifier: 'MIT', redistributable: true } }
        ]
    };
    const datasets = [
        { name: 'train', dataset: { services: [{ serviceId: 'train', properties: [{ fieldId: 'x/Status' }] }] } },
        {
            name: 'known-sap-holdout',
            dataset: {
                services: [
                    { serviceId: 'travel', properties: [{ fieldId: 'x/TravelStatus' }] },
                    { serviceId: 'internal', properties: [{ fieldId: 'x/Status' }] },
                    { serviceId: 'openapi', properties: [{ fieldId: 'x/Status' }] }
                ]
            }
        },
        {
            name: 'unseen-sap-holdout',
            dataset: { services: [{ serviceId: 'finance', properties: [{ fieldId: 'x/PaymentStatus' }] }] }
        }
    ];
    assert.deepEqual(eligiblePublicStatusHoldoutServices({ registry, datasets }), ['travel', 'finance']);
});

test('selects public train and calibration services without admitting holdouts or unsupported sources', () => {
    const registry = {
        services: [
            { id: 'train', source: { format: 'csn' }, license: { identifier: 'MIT', redistributable: true } },
            {
                id: 'calibration',
                source: { format: 'schema-graph' },
                license: { identifier: 'MIT', redistributable: true }
            },
            { id: 'holdout', source: { format: 'edmx' }, license: { identifier: 'MIT', redistributable: true } },
            {
                id: 'other-license',
                source: { format: 'edmx' },
                license: { identifier: 'CC-BY-4.0', redistributable: true }
            },
            { id: 'internal', source: { format: 'edmx' }, license: { redistributable: false } }
        ]
    };
    const datasets = [
        {
            name: 'train',
            dataset: {
                services: [
                    { serviceId: 'train', properties: [{ fieldId: 'x/Status' }] },
                    { serviceId: 'other-license', properties: [{ fieldId: 'x/Status' }] },
                    { serviceId: 'internal', properties: [{ fieldId: 'x/Status' }] }
                ]
            }
        },
        {
            name: 'calibration',
            dataset: { services: [{ serviceId: 'calibration', properties: [{ fieldId: 'x/Status' }] }] }
        },
        {
            name: 'known-sap-holdout',
            dataset: { services: [{ serviceId: 'holdout', properties: [{ fieldId: 'x/Status' }] }] }
        }
    ];
    assert.deepEqual(eligiblePublicStatusServices({ registry, datasets, partitions: ['train', 'calibration'] }), [
        'train',
        'calibration'
    ]);
});

test('admits only explicitly authorized internal structural metadata to the private training queue', () => {
    const authorized = {
        identifier: 'INTERNAL-OWNER-AUTHORIZATION',
        redistributable: false
    };
    const registry = {
        services: [
            {
                id: 'approved',
                source: { format: 'edmx' },
                license: authorized,
                trainingAuthorization: { scope: 'structural-metadata-only', privacyReview: { status: 'passed' } }
            },
            {
                id: 'denied',
                source: { format: 'edmx' },
                license: authorized,
                trainingAuthorization: { scope: 'structural-metadata-only', privacyReview: { status: 'pending' } }
            },
            { id: 'public', source: { format: 'csn' }, license: { identifier: 'MIT', redistributable: true } }
        ]
    };
    const datasets = [
        {
            name: 'calibration',
            dataset: {
                services: [
                    { serviceId: 'approved', properties: [{ fieldId: 'x/Status' }] },
                    { serviceId: 'denied', properties: [{ fieldId: 'x/Status' }] },
                    { serviceId: 'public', properties: [{ fieldId: 'x/Status' }] }
                ]
            }
        }
    ];
    assert.deepEqual(eligibleAuthorizedStatusTrainingServices({ registry, datasets }), ['approved', 'public']);
});

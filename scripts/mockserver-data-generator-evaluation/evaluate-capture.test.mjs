import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { executeEvaluateCaptureCommand } from './lib/evaluate-capture.mjs';

const hash = 'a'.repeat(64);

test('rejects an empty requested resource even without relationship metadata', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mockgen-empty-request-'));
    await writeCapture(join(root, 'capture'), { Items: [] });
    const report = await executeEvaluateCaptureCommand([
        '--capture',
        join(root, 'capture'),
        '--output',
        join(root, 'report.json')
    ]);
    assert.equal(report.passed, false);
    assert.deepEqual(report.captures[0].issues[0], {
        rule: 'resource-non-empty',
        message: 'A requested generated resource is empty',
        resource: 'Items'
    });
    const cli = spawnSync(
        process.execPath,
        [
            fileURLToPath(new URL('./evaluate-capture.mjs', import.meta.url)),
            '--capture',
            join(root, 'capture'),
            '--output',
            join(root, 'cli-report.json')
        ],
        { encoding: 'utf8' }
    );
    assert.equal(cli.status, 1);
});

test('checks hash-bound authored parents in memory without including their values in reports', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mockgen-authored-evaluation-'));
    const app = join(root, 'app');
    const captureRoot = join(root, 'capture');
    await mkdir(app);
    const metadata =
        '<edmx:Edmx Version="4.0"><edmx:DataServices><Schema Namespace="Demo"><EntityType Name="Parent"><Key><PropertyRef Name="ID"/></Key><Property Name="ID" Type="Edm.Int32"/></EntityType><EntityContainer Name="C"><EntitySet Name="Parents" EntityType="Demo.Parent"/></EntityContainer></Schema></edmx:DataServices></edmx:Edmx>';
    const config =
        'server:\n  customMiddleware:\n    - name: sap-fe-mockserver\n      configuration:\n        services:\n          - urlPath: /demo\n            metadataPath: metadata.xml\n            mockdataPath: .\n';
    await writeFile(join(app, 'ui5-mock.yaml'), config);
    await writeFile(join(app, 'metadata.xml'), metadata);
    const parents = [{ ID: 1, Name: 'PRIVATE_AUTHORED_SENTINEL' }];
    await writeFile(join(app, 'Parents.json'), JSON.stringify(parents));
    await writeCapture(captureRoot, { Children: [{ ID: 2, ParentID: 1 }] }, [
        {
            name: 'parent',
            fromResource: 'Children',
            toResource: 'Parents',
            mappings: [{ sourceProperty: 'ParentID', targetProperty: 'ID' }]
        }
    ]);
    const captureFile = join(captureRoot, 'capture.json');
    const capture = JSON.parse(await readFile(captureFile, 'utf8'));
    const digest = (value) => createHash('sha256').update(value).digest('hex');
    capture.scenario = 'source-precedence';
    capture.hashes = { config: digest(config), metadata: digest(metadata) };
    capture.inspection.sourceOwnership = [
        {
            resource: 'Parents',
            eligible: false,
            contributor: { present: false },
            initialRows: { source: 'json', present: true, rowCount: 1, sha256: digest(JSON.stringify(parents)) }
        }
    ];
    capture.authoredContext = { Parents: parents };
    await writeFile(captureFile, JSON.stringify(capture));
    const unbound = await executeEvaluateCaptureCommand([
        '--capture',
        captureRoot,
        '--output',
        join(root, 'unbound.json')
    ]);
    assert.equal(unbound.passed, false);
    const args = ['--capture', captureRoot, '--app', app, '--config', 'ui5-mock.yaml'];
    await assert.rejects(
        executeEvaluateCaptureCommand([...args, '--output', join(root, 'wrong-app.json')]),
        /app.*hash/iu
    );
    const summaryPath = join(captureRoot, 'capture-summary.json');
    const summary = JSON.parse(await readFile(summaryPath, 'utf8'));
    summary.hashes.app = digest(
        JSON.stringify(
            [
                ['ui5-mock.yaml', digest(config)],
                ['metadata.xml', digest(metadata)],
                ['/Parents.json', digest(JSON.stringify(parents))]
            ].sort(([left], [right]) => left.localeCompare(right))
        )
    );
    await writeFile(summaryPath, JSON.stringify(summary));
    const report = await executeEvaluateCaptureCommand([...args, '--output', join(root, 'report.json')]);
    assert.equal(report.passed, true);
    assert.equal(report.captures[0].resourceCount, 1);
    assert.equal(report.captures[0].authoredContextResources, 1);
    assert.ok(!(await readFile(join(root, 'report.json'), 'utf8')).includes('PRIVATE_AUTHORED_SENTINEL'));
    await writeFile(join(app, 'Parents.json'), '[{"ID":3}]');
    await assert.rejects(
        executeEvaluateCaptureCommand([...args, '--output', join(root, 'changed.json')]),
        /(?:authored|app).*hash/iu
    );
});

test('does not infer bank or phone jurisdiction from an address country', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mockgen-cross-border-'));
    await writeCapture(join(root, 'capture'), {
        Accounts: [{ ID: 1, Country: 'DE', Currency: 'USD', Phone: '+353123456789', BIC: 'AIBKIE2D' }]
    });
    const result = await executeEvaluateCaptureCommand([
        '--capture',
        join(root, 'capture'),
        '--output',
        join(root, 'report.json')
    ]);
    assert.equal(result.passed, true);
});

test('rejects invalid semantic formats without trusting a successful generator invariant', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mockgen-invalid-formats-'));
    await writeCapture(join(root, 'capture'), {
        Accounts: [{ ID: 1, IBAN: 'DE00370400440532013000', Email: 'maya.' }]
    });
    const result = await executeEvaluateCaptureCommand([
        '--capture',
        join(root, 'capture'),
        '--output',
        join(root, 'report.json')
    ]);
    assert.equal(result.passed, false);
});

test('rejects a foreign key when its captured target resource is empty', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mockgen-empty-target-'));
    await writeCapture(join(root, 'capture'), { Children: [{ ID: 2, ParentID: 1 }], Parents: [] }, [
        {
            name: 'parent',
            fromResource: 'Children',
            toResource: 'Parents',
            mappings: [{ sourceProperty: 'ParentID', targetProperty: 'ID' }]
        }
    ]);
    const result = await executeEvaluateCaptureCommand([
        '--capture',
        join(root, 'capture'),
        '--output',
        join(root, 'report.json')
    ]);
    assert.equal(result.passed, false);
});

function inspection(generatedValues, relationships = []) {
    return {
        version: 1,
        pipeline: 'semantic-v2',
        locale: 'en',
        hashes: { request: hash, metadata: hash },
        fingerprints: {},
        sourceOwnership: [],
        unsupportedSchemaElements: [],
        fieldDecisions: Object.keys(generatedValues).flatMap((resource) =>
            Object.keys(generatedValues[resource][0] ?? {}).map((property) => ({
                resource,
                entity: resource,
                property,
                primitiveType: typeof generatedValues[resource][0][property] === 'number' ? 'Edm.Int32' : 'Edm.String',
                isKey: property === 'ID',
                rawTop: [],
                acceptedRole:
                    property === 'Country' ? 'country' : property === 'CountryName' ? 'country_name' : undefined,
                providerState: 'available',
                rejectedCandidates: [],
                evidence: { annotations: [] }
            }))
        ),
        relationships,
        generatorsUsed: ['semantic-v2-deterministic'],
        generatedSummary: Object.entries(generatedValues).map(([resource, rows]) => ({
            resource,
            rowCount: rows.length,
            sha256: hash
        })),
        generatedValues,
        invariants: [{ name: 'generated-result', passed: true }],
        diagnostics: [],
        metrics: { timingsMs: { total: 1 }, rssBytes: { before: 1, after: 1 } }
    };
}

async function writeCapture(root, generatedValues, relationships) {
    await mkdir(root, { recursive: true });
    await writeFile(
        join(root, 'capture-summary.json'),
        JSON.stringify({
            version: 1,
            command: 'mockgen:capture-app',
            hashes: { app: hash, config: hash, metadata: [hash] },
            captures: [
                {
                    serviceIndex: 0,
                    service: '/demo',
                    scenario: 'generator-only',
                    pipeline: 'semantic-v2',
                    file: 'capture.json'
                }
            ]
        })
    );
    await writeFile(
        join(root, 'capture.json'),
        JSON.stringify({
            captureVersion: 1,
            scenario: 'generator-only',
            serviceIndex: 0,
            hashes: { config: hash, metadata: hash },
            inspection: inspection(generatedValues, relationships)
        })
    );
}

test('evaluates a coherent capture without leaking row values', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mockgen-evaluate-capture-pass-'));
    const output = join(root, 'report.json');
    await writeCapture(join(root, 'capture'), {
        Banks: [
            {
                ID: 1,
                Country: 'DE',
                CountryName: 'Germany',
                Region: 'BE',
                RegionName: 'Berlin',
                Phone: '+49 30 1234567',
                BankName: 'Deutsche Bank',
                BIC: 'DEUTDEFF',
                HouseBank: 'DE01',
                FirstName: 'Amelia',
                LastName: 'Fischer',
                FullName: 'Amelia Fischer',
                CreatedAt: '2026-01-01T00:00:00Z',
                ChangedAt: '2026-01-02T00:00:00Z'
            }
        ]
    });

    const report = await executeEvaluateCaptureCommand(['--capture', join(root, 'capture'), '--output', output]);

    assert.equal(report.passed, true);
    assert.equal(report.issueCount, 0);
    assert.equal(JSON.parse(await readFile(output, 'utf8')).version, 1);
});

test('reports finance coherence defects without serializing row values', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mockgen-evaluate-capture-fail-'));
    await writeCapture(join(root, 'capture'), {
        Banks: [
            {
                ID: 1,
                Country: 'DE',
                CountryName: 'France',
                Region: 'CA',
                Phone: '+353 1 1234567',
                BankName: 'Deutsche Bank',
                BIC: 'INVALID',
                HouseBank: 'US01',
                FirstName: 'Amelia',
                LastName: 'Fischer',
                FullName: 'Amelia',
                CreatedAt: '2026-01-03T00:00:00Z',
                ChangedAt: '2026-01-02T00:00:00Z'
            }
        ]
    });

    const report = await executeEvaluateCaptureCommand([
        '--capture',
        join(root, 'capture'),
        '--output',
        join(root, 'report.json')
    ]);
    const serialized = JSON.stringify(report);

    assert.equal(report.passed, false);
    assert.ok(report.issueCount >= 4);
    assert.match(serialized, /finance-country-name/u);
    assert.match(serialized, /finance-bank-bic/u);
    assert.match(serialized, /finance-full-name/u);
    assert.match(serialized, /temporal-ordering/u);
    assert.doesNotMatch(serialized, /France|INVALID|Amelia Fischer|\+353/u);
});

test('accepts a valid relationship whose source and target properties have different names', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mockgen-valid-link-'));
    await writeCapture(join(root, 'capture'), { Parents: [{ ID: 1 }], Children: [{ ID: 2, ParentID: 1 }] }, [
        {
            fromResource: 'Children',
            toResource: 'Parents',
            mappings: [{ sourceProperty: 'ParentID', targetProperty: 'ID' }]
        }
    ]);
    const report = await executeEvaluateCaptureCommand([
        '--capture',
        join(root, 'capture'),
        '--output',
        join(root, 'report.json')
    ]);
    assert.equal(report.passed, true);
});

test('does not equate an absent relationship key with an explicit null key', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mockgen-relationship-missing-key-'));
    await writeCapture(join(root, 'capture'), { Parents: [{ ID: null }], Children: [{ ParentID: undefined }] }, [
        {
            fromResource: 'Children',
            toResource: 'Parents',
            mappings: [{ sourceProperty: 'ParentID', targetProperty: 'ID' }]
        }
    ]);
    const path = join(root, 'capture', 'capture.json');
    const capture = JSON.parse(await readFile(path, 'utf8'));
    delete capture.inspection.generatedValues.Children[0].ParentID;
    await writeFile(path, JSON.stringify(capture));
    const report = await executeEvaluateCaptureCommand([
        '--capture',
        join(root, 'capture'),
        '--output',
        join(root, 'report.json')
    ]);
    assert.equal(report.passed, false);
    assert.match(JSON.stringify(report), /relationship-mapping/u);
});

test('checks child counts independently for multiple incoming relationships', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mockgen-multiple-relationships-'));
    await writeCapture(
        join(root, 'capture'),
        {
            Parents: [{ ID: 1, ChildCount: 1 }],
            Orders: [{ ParentID: 1 }],
            Notes: [{ ParentID: 1 }, { ParentID: 1 }]
        },
        [
            {
                fromResource: 'Orders',
                toResource: 'Parents',
                mappings: [{ sourceProperty: 'ParentID', targetProperty: 'ID' }]
            },
            {
                fromResource: 'Notes',
                toResource: 'Parents',
                mappings: [{ sourceProperty: 'ParentID', targetProperty: 'ID' }]
            }
        ]
    );
    const report = await executeEvaluateCaptureCommand([
        '--capture',
        join(root, 'capture'),
        '--output',
        join(root, 'report.json')
    ]);
    assert.equal(report.passed, false);
    assert.match(JSON.stringify(report), /ambiguous-child-count/u);
});

test('does not invent a count obligation merely because several resources reference a parent', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mockgen-no-count-'));
    await writeCapture(
        join(root, 'capture'),
        {
            Parents: [{ ID: 1 }],
            Orders: [{ ParentID: 1 }],
            Notes: [{ ParentID: 1 }]
        },
        ['Orders', 'Notes'].map((fromResource) => ({
            fromResource,
            toResource: 'Parents',
            mappings: [{ sourceProperty: 'ParentID', targetProperty: 'ID' }]
        }))
    );
    const report = await executeEvaluateCaptureCommand([
        '--capture',
        join(root, 'capture'),
        '--output',
        join(root, 'report.json')
    ]);
    assert.equal(report.passed, true);
});

test('accepts a localized country name when the capture declares its locale', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mockgen-localized-country-'));
    await writeCapture(join(root, 'capture'), {
        Banks: [{ ID: 1, Country: 'ES', CountryName: 'España', BIC: 'EXAMFRPP' }]
    });
    const path = join(root, 'capture', 'capture.json');
    const capture = JSON.parse(await readFile(path, 'utf8'));
    capture.inspection.locale = 'es';
    await writeFile(path, JSON.stringify(capture));
    const report = await executeEvaluateCaptureCommand([
        '--capture',
        join(root, 'capture'),
        '--output',
        join(root, 'report.json')
    ]);
    assert.equal(report.passed, true);
    assert.doesNotMatch(JSON.stringify(report), /finance-country-name/u);
});

test('does not claim an authored localized sentinel is inconsistent without row evidence', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mockgen-authored-country-'));
    await writeCapture(join(root, 'capture'), {
        Banks: [{ ID: 1, Country: 'DE', CountryName: 'Deutschland', BIC: 'EXAMFRPP' }]
    });
    const path = join(root, 'capture', 'capture.json');
    const capture = JSON.parse(await readFile(path, 'utf8'));
    capture.inspection.sourceOwnership = [
        {
            resource: 'Banks',
            eligible: true,
            initialRows: { source: 'json', present: true, rowCount: 1 }
        }
    ];
    await writeFile(path, JSON.stringify(capture));
    const report = await executeEvaluateCaptureCommand([
        '--capture',
        join(root, 'capture'),
        '--output',
        join(root, 'report.json')
    ]);
    assert.equal(report.passed, false);
    assert.match(JSON.stringify(report), /authored-text-unverified/u);
    assert.doesNotMatch(JSON.stringify(report), /finance-country-name/u);
});

test('reports missing field context as unverified evidence', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mockgen-unverified-context-'));
    await writeCapture(join(root, 'capture'), { Items: [{ ID: 1 }] });
    const path = join(root, 'capture', 'capture.json');
    const capture = JSON.parse(await readFile(path, 'utf8'));
    delete capture.inspection.fieldDecisions;
    delete capture.inspection.sourceOwnership;
    await writeFile(path, JSON.stringify(capture));
    const report = await executeEvaluateCaptureCommand([
        '--capture',
        join(root, 'capture'),
        '--output',
        join(root, 'report.json')
    ]);
    assert.equal(report.passed, false);
    assert.equal(report.unverifiedCount, 2);
    assert.match(JSON.stringify(report), /unverified/u);
});

test('routes an unverified semantic invariant to unverified evidence', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mockgen-unverified-invariant-'));
    await writeCapture(join(root, 'capture'), { Items: [{ ID: 1 }] });
    const path = join(root, 'capture', 'capture.json');
    const capture = JSON.parse(await readFile(path, 'utf8'));
    capture.inspection.invariants = [{ name: 'semantic-domains', passed: false, status: 'unverified' }];
    await writeFile(path, JSON.stringify(capture));
    const report = await executeEvaluateCaptureCommand([
        '--capture',
        join(root, 'capture'),
        '--output',
        join(root, 'report.json')
    ]);
    assert.equal(report.passed, false);
    assert.equal(report.issueCount, 0);
    assert.match(JSON.stringify(report), /reported-invariant-unverified/u);
    assert.doesNotMatch(JSON.stringify(report), /reported-invariant"/u);
});

test('fails when an eligible resource is missing entirely', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mockgen-missing-resource-'));
    const captureRoot = join(root, 'capture');
    await writeCapture(captureRoot, {});
    const path = join(captureRoot, 'capture.json');
    const capture = JSON.parse(await readFile(path, 'utf8'));
    capture.inspection.sourceOwnership = [{ resource: 'Missing', eligible: true }];
    await writeFile(path, JSON.stringify(capture));
    const report = await executeEvaluateCaptureCommand([
        '--capture',
        captureRoot,
        '--output',
        join(root, 'report.json')
    ]);
    assert.equal(report.passed, false);
    assert.match(JSON.stringify(report), /resource-missing/u);
});

test('does not reject valid countries and banks outside the generator catalog', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mockgen-independent-domain-'));
    await writeCapture(join(root, 'capture'), {
        Banks: [{ ID: 1, Country: 'FR', CountryName: 'France', BankName: 'Example Bank', BIC: 'ABCDEFGH' }]
    });
    const path = join(root, 'capture', 'capture.json');
    const capture = JSON.parse(await readFile(path, 'utf8'));
    capture.inspection.generatedValues.Banks[0].BIC = 'EXAMFRPP';
    await writeFile(path, JSON.stringify(capture));
    const report = await executeEvaluateCaptureCommand([
        '--capture',
        join(root, 'capture'),
        '--output',
        join(root, 'report.json')
    ]);
    assert.equal(report.passed, true);
});

test('reports relationship and child-count defects without serializing row values', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mockgen-evaluate-capture-relationships-'));
    await writeCapture(
        join(root, 'capture'),
        {
            Customers: [
                { ID: 'customer-alpha', ChildCount: 2, HasChildren: true, CustomerName: 'Customer Alpha Secret' },
                { ID: 'customer-beta', ChildCount: 1, HasChildren: true, CustomerName: 'Customer Beta Secret' }
            ],
            Orders: [
                { ID: 'order-alpha', CustomerID: 'customer-alpha', Description: 'Order Alpha Secret' },
                { ID: 'order-orphan', CustomerID: 'customer-gamma', Description: 'Order Gamma Secret' }
            ]
        },
        [
            {
                fromResource: 'Orders',
                toResource: 'Customers',
                mappings: [{ sourceProperty: 'CustomerID', targetProperty: 'ID' }]
            }
        ]
    );

    const report = await executeEvaluateCaptureCommand([
        '--capture',
        join(root, 'capture'),
        '--output',
        join(root, 'report.json')
    ]);
    const serialized = JSON.stringify(report);

    assert.equal(report.passed, false);
    assert.match(serialized, /relationship-mapping/u);
    assert.match(serialized, /child-count/u);
    assert.match(serialized, /child-has-flag/u);
    assert.doesNotMatch(
        serialized,
        /customer-alpha|customer-beta|customer-gamma|Customer Alpha Secret|Customer Beta Secret|Order Alpha Secret|Order Gamma Secret/u
    );
});

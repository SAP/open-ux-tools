import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { executeCaptureAppCommand } from './lib/capture-app.mjs';

const metadata = `<?xml version="1.0"?>
<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
  <edmx:DataServices>
    <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Demo">
      <EntityType Name="Row"><Key><PropertyRef Name="ID"/></Key><Property Name="ID" Type="Edm.Int32" Nullable="false"/></EntityType>
      <EntityContainer Name="Container">
        <EntitySet Name="Authored" EntityType="Demo.Row"/>
        <EntitySet Name="Missing" EntityType="Demo.Row"/>
      </EntityContainer>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`;

test('captures source-precedence and generator-only scenarios without modifying the app', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mockgen-capture-test-'));
    const app = join(root, 'app');
    const output = join(root, 'output');
    const service = join(app, 'webapp', 'localService', 'mainService');
    const data = join(service, 'data');
    await mkdir(data, { recursive: true });
    await writeFile(join(service, 'metadata.xml'), metadata);
    await writeFile(join(data, 'Authored.json'), '[]');
    await writeFile(
        join(app, 'ui5-mock.yaml'),
        `server:\n  customMiddleware:\n    - name: sap-fe-mockserver\n      configuration:\n        services:\n          - urlPath: /demo\n            metadataPath: ./webapp/localService/mainService/metadata.xml\n            mockdataPath: ./webapp/localService/mainService/data\n`
    );
    const calls = [];
    const inspectService = async (request, options, _runtime, inspectionOptions) => {
        calls.push({ request, options, inspectionOptions });
        return {
            version: 1,
            pipeline: options.pipeline,
            hashes: { request: 'a'.repeat(64), metadata: 'b'.repeat(64) },
            fingerprints: {},
            sourceOwnership: [],
            unsupportedSchemaElements: [],
            fieldDecisions: [],
            relationships: [],
            generatorsUsed: [],
            generatedSummary: [],
            generatedValues: {},
            invariants: [],
            diagnostics: [],
            metrics: { timingsMs: { total: 1 }, rssBytes: { before: 1, after: 1 } }
        };
    };

    const summary = await executeCaptureAppCommand(
        ['--app', app, '--config', 'ui5-mock.yaml', '--pipeline', 'legacy,semantic-v2', '--output', output],
        {
            inspectService,
            parseMetadataTargets: () => [
                { name: 'Authored', kind: 'entity-set' },
                { name: 'Missing', kind: 'entity-set' }
            ]
        }
    );

    assert.equal(calls.length, 4);
    assert.deepEqual(
        calls.filter(({ options }) => options.pipeline === 'legacy').map(({ request }) => request.targets),
        [
            [{ name: 'Missing', kind: 'entity-set' }],
            [
                { name: 'Authored', kind: 'entity-set' },
                { name: 'Missing', kind: 'entity-set' }
            ]
        ]
    );
    assert.ok(calls.every(({ inspectionOptions }) => inspectionOptions.includeGeneratedValues === true));
    assert.match(summary.hashes.app, /^[a-f0-9]{64}$/u);
    assert.match(summary.hashes.config, /^[a-f0-9]{64}$/u);
    assert.match(summary.hashes.metadata[0], /^[a-f0-9]{64}$/u);
    assert.equal(summary.captures.length, 4);
    assert.equal(await readFile(join(data, 'Authored.json'), 'utf8'), '[]');
    assert.equal(JSON.parse(await readFile(join(output, 'capture-summary.json'), 'utf8')).version, 1);
});

test('removes allowlisted empty sources from provider input and preserves OData v2', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mockgen-capture-empty-'));
    const app = join(root, 'app');
    await mkdir(app);
    await writeFile(
        join(app, 'metadata.xml'),
        metadata
            .replace('Version="4.0"', 'Version="1.0"')
            .replace(
                '<edmx:DataServices>',
                '<edmx:DataServices m:DataServiceVersion="2.0" xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata">'
            )
    );
    await writeFile(join(app, 'Authored.json'), '[]');
    await writeFile(
        join(app, 'ui5.yaml'),
        'server:\n  customMiddleware:\n    - name: sap-fe-mockserver\n      configuration:\n        mockDataGenerator:\n          generateForEmptyJson: [Authored]\n        services:\n          - urlPath: /demo\n            metadataPath: metadata.xml\n            mockdataPath: .\n'
    );
    const calls = [];
    const summary = await executeCaptureAppCommand(
        ['--app', app, '--config', 'ui5.yaml', '--pipeline', 'semantic-v2', '--output', join(root, 'output')],
        {
            parseMetadataTargets: () => [{ name: 'Authored', kind: 'entity-set' }],
            inspectService: async (request) => {
                calls.push(request);
                return { generatedValues: {} };
            }
        }
    );
    assert.equal(calls[0].existingData.Authored.initialRows.source, 'none');
    assert.equal(calls[0].service.odataVersion, '2.0');
    assert.equal(summary.executionMode, 'deterministic-inspection');
});

test('loads and disposes an explicitly selected learned runtime', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mockgen-capture-learned-'));
    const app = join(root, 'app');
    await mkdir(app);
    await writeFile(join(app, 'metadata.xml'), metadata);
    await writeFile(
        join(app, 'ui5.yaml'),
        'server:\n  customMiddleware:\n    - name: sap-fe-mockserver\n      configuration:\n        services:\n          - urlPath: /demo\n            metadataPath: metadata.xml\n'
    );
    let loaded = 0;
    let disposed = 0;
    const runtime = { classifier: { fingerprint: 'test' } };
    const report = await executeCaptureAppCommand(
        [
            '--app',
            app,
            '--config',
            'ui5.yaml',
            '--pipeline',
            'semantic-v2',
            '--output',
            join(root, 'output'),
            '--execution',
            'learned',
            '--model-manifest',
            join(root, 'manifest.json')
        ],
        {
            parseMetadataTargets: () => [{ name: 'Missing', kind: 'entity-set' }],
            loadRuntime: async () => {
                loaded++;
                return {
                    runtime,
                    diagnostics: [],
                    dispose: async () => {
                        disposed++;
                    }
                };
            },
            inspectService: async (_request, _options, received) => {
                assert.equal(received, runtime);
                return { generatedValues: {} };
            }
        }
    );
    assert.equal(report.executionMode, 'learned-inspection');
    assert.equal(loaded, 1);
    assert.equal(disposed, 1);
});

test('rejects config, metadata, and mockdata paths outside the app root', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mockgen-capture-containment-'));
    const app = join(root, 'app');
    const outside = join(root, 'outside');
    await mkdir(app, { recursive: true });
    await mkdir(outside, { recursive: true });
    await writeFile(join(outside, 'outside.yaml'), 'server: {}');
    await assert.rejects(
        executeCaptureAppCommand([
            '--app',
            app,
            '--config',
            '../outside/outside.yaml',
            '--pipeline',
            'semantic-v2',
            '--output',
            join(root, 'output')
        ]),
        /inside the application directory/u
    );
    await writeFile(
        join(app, 'ui5.yaml'),
        `server:\n  customMiddleware:\n    - name: sap-fe-mockserver\n      configuration:\n        services:\n          - urlPath: /demo\n            metadataPath: ../outside/metadata.xml\n            mockdataPath: data\n`
    );
    await writeFile(join(outside, 'metadata.xml'), metadata);
    await assert.rejects(
        executeCaptureAppCommand(
            ['--app', app, '--config', 'ui5.yaml', '--pipeline', 'semantic-v2', '--output', join(root, 'output2')],
            { parseMetadataTargets: () => [] }
        ),
        /inside the application directory/u
    );
    await writeFile(
        join(app, 'ui5.yaml'),
        `server:\n  customMiddleware:\n    - name: sap-fe-mockserver\n      configuration:\n        services:\n          - urlPath: /demo\n            metadataPath: metadata.xml\n            mockdataPath: ../outside\n`
    );
    await writeFile(join(app, 'metadata.xml'), metadata);
    await assert.rejects(
        executeCaptureAppCommand(
            ['--app', app, '--config', 'ui5.yaml', '--pipeline', 'semantic-v2', '--output', join(root, 'output3')],
            { parseMetadataTargets: () => [] }
        ),
        /inside the application directory/u
    );
});

test('rejects a symlinked metadata or mockdata directory escaping the app root', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mockgen-capture-symlink-'));
    const app = join(root, 'app');
    const outside = join(root, 'outside');
    await mkdir(app, { recursive: true });
    await mkdir(outside, { recursive: true });
    await writeFile(join(outside, 'metadata.xml'), metadata);
    await symlink(outside, join(app, 'linked'));
    await writeFile(
        join(app, 'ui5.yaml'),
        `server:\n  customMiddleware:\n    - name: sap-fe-mockserver\n      configuration:\n        services:\n          - urlPath: /demo\n            metadataPath: linked/metadata.xml\n            mockdataPath: data\n`
    );
    await assert.rejects(
        executeCaptureAppCommand(
            ['--app', app, '--config', 'ui5.yaml', '--pipeline', 'semantic-v2', '--output', join(root, 'output')],
            { parseMetadataTargets: () => [] }
        ),
        /inside the application directory/u
    );
    await writeFile(join(app, 'metadata.xml'), metadata);
    await writeFile(join(outside, 'Authored.json'), '[{"ID":1}]');
    await symlink(outside, join(app, 'linked-data'));
    await writeFile(
        join(app, 'ui5.yaml'),
        `server:\n  customMiddleware:\n    - name: sap-fe-mockserver\n      configuration:\n        services:\n          - urlPath: /demo\n            metadataPath: metadata.xml\n            mockdataPath: linked-data\n`
    );
    await assert.rejects(
        executeCaptureAppCommand(
            ['--app', app, '--config', 'ui5.yaml', '--pipeline', 'semantic-v2', '--output', join(root, 'output2')],
            {
                parseMetadataTargets: () => [{ name: 'Authored', kind: 'entity-set' }],
                inspectService: async () => ({ generatedValues: {} })
            }
        ),
        /inside the application directory/u
    );
});

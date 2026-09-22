import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { copyFile, mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import test from 'node:test';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildLiveHttpReport, executeLiveHttpCaptureCommand, parseArguments } from './lib/live-http-capture.mjs';
import { startFinancePreview } from './lib/finance-preview.mjs';

test('rejects missing live HTTP CLI scope and duplicate options', () => {
    assert.throws(() => parseArguments(['--app', '/tmp/app']), /requires --config/u);
    assert.throws(
        () =>
            parseArguments([
                '--app',
                '/tmp/app',
                '--config',
                'x',
                '--output',
                'x',
                '--service-path',
                '/x',
                '--resources',
                'A',
                '--resources',
                'B'
            ]),
        /Invalid or duplicate/u
    );
    assert.throws(
        () =>
            parseArguments([
                '--app',
                '/tmp/app',
                '--config',
                'x',
                '--output',
                'x',
                '--service-path',
                '/x',
                '--resources',
                '../Secret'
            ]),
        /must not escape/u
    );
    assert.throws(
        () =>
            parseArguments([
                '--app',
                '/tmp/app',
                '--config',
                'x',
                '--output',
                'x',
                '--service-path',
                '/x',
                '--resources',
                'Items%2fSecret'
            ]),
        /encoded path escape/u
    );
});

test('builds a privacy-safe live report and fails a non-200 expected resource', async () => {
    const report = await buildLiveHttpReport({
        baseUrl: 'http://example.test',
        servicePath: '/demo',
        resources: ['Items', 'Missing'],
        fetchImpl: async (url) => {
            const path = new URL(url).pathname;
            if (path.endsWith('$metadata')) return new Response('<edmx/>', { status: 200 });
            if (path.endsWith('/Items'))
                return new Response(JSON.stringify({ value: [{ Secret: 'do-not-report' }] }), {
                    status: 200,
                    headers: { 'content-type': 'application/json' }
                });
            return new Response('missing', { status: 404 });
        }
    });
    assert.equal(report.executionMode, 'live-http');
    assert.equal(report.passed, false);
    assert.equal(report.ui.status, 'not-run');
    assert.ok(report.requests.every((request) => !Object.hasOwn(request, 'generatedValues')));
    assert.doesNotMatch(JSON.stringify(report), /do-not-report/u);
});

test('fails non-JSON resources and redacts query values and fetch errors', async () => {
    const report = await buildLiveHttpReport({
        baseUrl: 'http://example.test',
        servicePath: '/demo',
        resources: ['Items'],
        navigations: ['Items(SECRET-KEY)?$filter=Name%20eq%20%27SECRET-VALUE%27'],
        fetchImpl: async (url) => {
            if (new URL(url).pathname === '/demo/$metadata') return new Response('<edmx/>', { status: 200 });
            throw new Error('SECRET-ERROR');
        }
    });
    assert.equal(report.passed, false);
    assert.doesNotMatch(JSON.stringify(report), /SECRET/u);
    assert.ok(report.requests.every((request) => !request.path.includes('?')));
    assert.equal(report.requests.at(-1).error, 'fetch-failed');
});

test('fails successful responses with the wrong metadata or collection protocol', async () => {
    const report = await buildLiveHttpReport({
        baseUrl: 'http://example.test',
        servicePath: '/demo',
        resources: ['Items'],
        fetchImpl: async (url) =>
            new URL(url).pathname.endsWith('$metadata')
                ? new Response(JSON.stringify({ value: [] }), {
                      status: 200,
                      headers: { 'content-type': 'application/json' }
                  })
                : new Response('not-json', { status: 200, headers: { 'content-type': 'text/plain' } })
    });
    assert.equal(report.passed, false);
    assert.equal(report.checks.metadata, false);
    assert.equal(report.checks.expectedResources, false);
});

test('accepts a singleton JSON object for an explicit navigation', async () => {
    const report = await buildLiveHttpReport({
        baseUrl: 'http://example.test',
        servicePath: '/demo',
        resources: [],
        navigations: ['Items(1)'],
        fetchImpl: async (url) =>
            new URL(url).pathname.endsWith('$metadata')
                ? new Response('<edmx/>', { status: 200 })
                : new Response(JSON.stringify({ ID: 1 }), {
                      status: 200,
                      headers: { 'content-type': 'application/json' }
                  })
    });
    assert.equal(report.passed, true);
    assert.equal(report.requests.at(-1).responseKind, 'navigation');
    assert.equal(report.requests.at(-1).checks.collection, null);
    assert.equal(report.requests.at(-1).checks.navigation, true);
});

test('captures the unchanged app through the real host endpoint', async () => {
    const app = await mkdtemp(join(tmpdir(), 'mockgen-live-http-'));
    let preview;
    try {
        await mkdir(join(app, 'webapp/data'), { recursive: true });
        await writeFile(join(app, 'webapp/index.html'), '<title>Live fixture</title>');
        await copyFile(
            resolve('packages/mockserver-data-generator/test/unit/finance-manage.metadata.xml'),
            join(app, 'webapp/metadata.xml')
        );
        await writeFile(
            join(app, 'ui5-mock.yaml'),
            `server:\n  customMiddleware:\n    - name: sap-fe-mockserver\n      configuration:\n        services:\n          - urlPath: /finance\n            metadataPath: ./webapp/metadata.xml\n            mockdataPath: ./webapp/data\n            generateMockData: true\n`
        );
        preview = await startFinancePreview({
            app,
            generatorOptions: { pipeline: 'semantic-v2', rowsPerEntity: 1, generatedDataCache: false }
        });
        const report = await buildLiveHttpReport({
            baseUrl: preview.url,
            servicePath: '/finance',
            resources: ['CashBank'],
            navigations: ['CashBank?$expand=_HouseBank']
        });
        assert.equal(report.executionMode, 'live-http');
        assert.equal(report.passed, true);
        assert.equal(report.requests.length, 3);
        assert.equal(report.ui.status, 'not-run');
        assert.ok(report.requests.every((request) => !Object.hasOwn(request, 'generatedValues')));
    } finally {
        await preview?.close();
        await rm(app, { recursive: true, force: true });
    }
});

test('CLI exits nonzero when a real expected resource is missing', async () => {
    const app = await mkdtemp(join(tmpdir(), 'mockgen-live-cli-'));
    const output = join(app, 'report.json');
    try {
        await mkdir(join(app, 'webapp/data'), { recursive: true });
        await writeFile(join(app, 'webapp/index.html'), '<title>Live fixture</title>');
        await copyFile(
            resolve('packages/mockserver-data-generator/test/unit/finance-manage.metadata.xml'),
            join(app, 'webapp/metadata.xml')
        );
        await writeFile(
            join(app, 'ui5-mock.yaml'),
            `server:\n  customMiddleware:\n    - name: sap-fe-mockserver\n      configuration:\n        services:\n          - urlPath: /finance\n            metadataPath: ./webapp/metadata.xml\n            mockdataPath: ./webapp/data\n            generateMockData: true\n`
        );
        const script = resolve(dirname(fileURLToPath(import.meta.url)), 'live-http-capture.mjs');
        const result = await new Promise((resolveResult, reject) => {
            const child = spawn(
                process.execPath,
                [
                    script,
                    '--app',
                    app,
                    '--config',
                    'ui5-mock.yaml',
                    '--output',
                    output,
                    '--service-path',
                    '/finance',
                    '--resources',
                    'MissingResource'
                ],
                { cwd: resolve('.') }
            );
            let stderr = '';
            let stdout = '';
            child.stderr.on('data', (chunk) => {
                stderr += chunk;
            });
            child.stdout.on('data', (chunk) => {
                stdout += chunk;
            });
            child.on('error', reject);
            child.on('close', (code) => resolveResult({ code, stderr, stdout }));
        });
        assert.equal(result.code, 1);
        assert.match(result.stdout, /"passed":false/u);
    } finally {
        await rm(app, { recursive: true, force: true });
    }
});

test('passes configured provider options through preview and keeps UI not-run', async () => {
    const calls = [];
    const output = join(await mkdtemp(join(tmpdir(), 'mockgen-live-output-')), 'report.json');
    const report = await executeLiveHttpCaptureCommand(
        [
            '--app',
            '/tmp/app',
            '--config',
            'ui5-mock.yaml',
            '--output',
            output,
            '--service-path',
            '/demo',
            '--resources',
            'Items',
            '--include-generated-values'
        ],
        {
            startPreview: async ({ generatorOptions }) => {
                calls.push(generatorOptions);
                return { url: 'http://example.test/', close: async () => {} };
            },
            fetchImpl: async (url) =>
                new URL(url).pathname.endsWith('$metadata')
                    ? new Response('<edmx/>', { status: 200 })
                    : new Response(JSON.stringify({ value: [{ Secret: 'explicit' }] }), {
                          status: 200,
                          headers: { 'content-type': 'application/json' }
                      }),
            writeReport: async (_path, value) => {
                assert.equal(value.ui.status, 'not-run');
                assert.equal(value.executionMode, 'live-http');
            }
        }
    );
    assert.deepEqual(calls, [{}]);
    assert.equal(report.passed, true);
    assert.equal(report.requestedExecution, 'deterministic');
    assert.equal(report.observedExecution, 'not-instrumented');
});

test('does not serialize raw provider options', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mockgen-live-options-'));
    const optionsFile = join(root, 'options.json');
    await writeFile(
        optionsFile,
        JSON.stringify({
            mode: 'learned',
            sampleDataset: { id: 'fixture', version: '1', firstNames: ['SECRET-NAME'] },
            syntheticScenario: { id: 'scenario', version: '1', domains: { Secret: ['SECRET-VALUE'] } },
            modelPath: '/private/SECRET-MODEL'
        })
    );
    const output = join(root, 'report.json');
    const report = await executeLiveHttpCaptureCommand(
        [
            '--app',
            '/tmp/app',
            '--config',
            'ui5-mock.yaml',
            '--output',
            output,
            '--service-path',
            '/demo',
            '--resources',
            'Items',
            '--options-file',
            optionsFile
        ],
        {
            startPreview: async ({ generatorOptions }) => {
                assert.equal(generatorOptions.mode, 'learned');
                return { url: 'http://example.test/', close: async () => {} };
            },
            fetchImpl: async (url) =>
                new URL(url).pathname.endsWith('$metadata')
                    ? new Response('<edmx/>', { status: 200 })
                    : new Response(JSON.stringify({ value: [] }), {
                          status: 200,
                          headers: { 'content-type': 'application/json' }
                      }),
            writeReport: async (_path, value) => {
                assert.doesNotMatch(JSON.stringify(value), /SECRET/u);
                assert.equal(value.requestedExecution, 'learned');
                assert.equal(value.observedExecution, 'not-instrumented');
                assert.ok(value.optionsSha256);
                assert.equal(value.requestedProvider.sampleDataset.id, 'fixture');
            }
        }
    );
    assert.equal(report.passed, true);
});

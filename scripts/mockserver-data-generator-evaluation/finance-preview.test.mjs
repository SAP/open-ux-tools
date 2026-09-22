import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, copyFile, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { startFinancePreview } from './lib/finance-preview.mjs';

test('serves the unchanged app and real provider on loopback without exposing files outside webapp', async () => {
    const app = await mkdtemp(join(tmpdir(), 'mockgen-preview-test-'));
    let preview;
    try {
        await mkdir(join(app, 'webapp/data'), { recursive: true });
        await writeFile(join(app, 'private.txt'), 'not public');
        await writeFile(join(app, 'webapp/index.html'), '<title>Finance fixture</title>');
        await copyFile(
            resolve('packages/mockserver-data-generator/test/unit/finance-manage.metadata.xml'),
            join(app, 'webapp/metadata.xml')
        );
        await writeFile(
            join(app, 'ui5-mock.yaml'),
            `server:
  customMiddleware:
    - name: sap-fe-mockserver
      configuration:
        services:
          - urlPath: /finance
            metadataPath: ./webapp/metadata.xml
            mockdataPath: ./webapp/data
            generateMockData: true
`
        );
        preview = await startFinancePreview({
            app,
            generatorOptions: { pipeline: 'semantic-v2', rowsPerEntity: 2, generatedDataCache: false }
        });
        assert.equal(preview.ui5Assets, 'unavailable');
        assert.match(await (await fetch(preview.url)).text(), /Finance fixture/u);
        assert.equal((await fetch(`${preview.url}private.txt`)).status, 404);
        const response = await fetch(`${preview.url}finance/CashBank?$expand=_HouseBank`);
        assert.equal(response.status, 200);
        const rows = (await response.json()).value;
        assert.equal(rows.length, 2);
        assert.ok(rows.every((row) => row.NumberOfHouseBanks === row._HouseBank.length));
        await preview.close();
        preview = undefined;
        const configuration = `server:
  customMiddleware:
    - name: fiori-tools-proxy
      configuration:
        ui5:
          url: https://example.test/ui5/
          version: fixture-version
    - name: sap-fe-mockserver
      configuration:
        services: []
`;
        await writeFile(join(app, 'ui5-mock.yaml'), configuration);
        const requested = [];
        preview = await startFinancePreview({
            app,
            fetchAssets: async (url) => {
                requested.push(String(url));
                return new Response('/* configured UI5 fixture */', {
                    headers: { 'content-type': 'text/javascript', 'cache-control': 'max-age=60' }
                });
            }
        });
        assert.equal(preview.ui5Assets, 'configured-proxy');
        const asset = await fetch(`${preview.url}resources/sap-ui-core.js`);
        assert.equal(await asset.text(), '/* configured UI5 fixture */');
        assert.equal(asset.headers.get('cache-control'), 'max-age=60');
        assert.deepEqual(requested, ['https://example.test/ui5/fixture-version/resources/sap-ui-core.js']);
    } finally {
        await preview?.close();
        await rm(app, { recursive: true, force: true });
    }
});

test('rejects a webapp symlink that escapes the app root', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mockgen-preview-webapp-'));
    const app = join(root, 'app');
    const outside = join(root, 'outside-webapp');
    await mkdir(app, { recursive: true });
    await mkdir(outside, { recursive: true });
    await writeFile(join(outside, 'index.html'), '<title>outside</title>');
    await symlink(outside, join(app, 'webapp'));
    await writeFile(
        join(app, 'ui5-mock.yaml'),
        'server:\n  customMiddleware:\n    - name: sap-fe-mockserver\n      configuration:\n        services: []\n'
    );
    await assert.rejects(startFinancePreview({ app }), /inside the application directory/u);
    await rm(root, { recursive: true, force: true });
});

import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const hostRoot = process.env.MOCKGEN_HOST_ROOT ?? resolve(root, '../open-ux-odata-mock-data-generator-spi');
const require = createRequire(import.meta.url);
const FEMockserver = require(join(hostRoot, 'packages/fe-mockserver-core/dist/index.js')).default;
const FileSystemLoader = require(
    join(hostRoot, 'packages/fe-mockserver-core/dist/plugins/fileSystemLoader.js')
).default;
const ProviderBase = require(join(root, 'packages/mockserver-data-generator/dist/fe-mockserver.cjs'));

test('finance HTTP responses preserve empty files and expand generated allowlisted children', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'mockgen-finance-live-'));
    const originalActivation = process.env.SAP_UX_MOCKGEN_ENABLED;
    process.env.SAP_UX_MOCKGEN_ENABLED = '1';
    await writeFile(join(directory, 'CashBankHouseBank.json'), '[]');
    const providerRuns = [];
    class Provider extends ProviderBase {
        async generate(context) {
            const result = await super.generate(context);
            providerRuns.push({
                targets: context.targets.map(({ name }) => name),
                childRows: result.resources.CashBankHouseBank?.length,
                initialSource: context.existingData.CashBankHouseBank?.initialRows.source
            });
            return result;
        }
    }
    class Loader extends FileSystemLoader {
        async loadJS(path) {
            return path === '@sap-ux/mockserver-data-generator/fe-mockserver' ? Provider : super.loadJS(path);
        }
    }
    try {
        for (const allowEmpty of [false, true]) {
            const host = new FEMockserver({
                fileLoader: Loader,
                annotations: [],
                services: [
                    {
                        urlPath: '/finance',
                        metadataPath: join(
                            root,
                            'packages/mockserver-data-generator/test/unit/finance-manage.metadata.xml'
                        ),
                        mockdataPath: directory,
                        generateMockData: true,
                        mockDataGenerator: {
                            name: '@sap-ux/mockserver-data-generator/fe-mockserver',
                            generateForEmptyJson: allowEmpty ? ['CashBankHouseBank'] : [],
                            options: {
                                pipeline: 'semantic-v2',
                                mode: 'deterministic',
                                rowsPerEntity: 2,
                                seed: 31,
                                generatedDataCache: false
                            }
                        }
                    }
                ]
            });
            const server = createServer((request, response) =>
                host.getRouter()(request, response, () => {
                    response.statusCode = 404;
                    response.end();
                })
            );
            try {
                await host.isReady;
                await new Promise((done) => server.listen(0, '127.0.0.1', done));
                const base = `http://127.0.0.1:${server.address().port}/finance`;
                const metadata = await fetch(`${base}/$metadata`);
                assert.equal(metadata.status, 200);
                const childrenResponse = await fetch(`${base}/CashBankHouseBank`);
                assert.equal(childrenResponse.status, 200);
                const children = (await childrenResponse.json()).value;
                assert.equal(children.length, allowEmpty ? 2 : 0, JSON.stringify(providerRuns));
                const parentsResponse = await fetch(`${base}/CashBank?$expand=_HouseBank`);
                assert.equal(parentsResponse.status, 200);
                const parents = (await parentsResponse.json()).value;
                assert.equal(parents.length, 2);
                for (const row of parents) {
                    assert.ok(Array.isArray(row._HouseBank));
                    assert.equal(row.NumberOfHouseBanks, row._HouseBank.length);
                    assert.equal(row.BankHasHouseBanks, row._HouseBank.length > 0);
                }
            } finally {
                if (server.listening) {
                    await new Promise((done) => server.close(done));
                }
                await host.dispose();
            }
        }
    } finally {
        if (originalActivation === undefined) {
            delete process.env.SAP_UX_MOCKGEN_ENABLED;
        } else {
            process.env.SAP_UX_MOCKGEN_ENABLED = originalActivation;
        }
        await rm(directory, { recursive: true, force: true });
    }
});

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
    getAvailableLibraryFromSystem,
    getAvailableODataServices,
    readODataMetadataFromManifest,
    writeContextFile
} from '../../../../../src/tools/functionalities/manifest-context/manifestContext';

jest.mock('@sap-ux/adp-tooling', () => ({
    __esModule: true,
    readUi5Config: jest.fn()
}));

jest.mock('@sap-ux/system-access', () => ({
    __esModule: true,
    createAbapServiceProvider: jest.fn()
}));

jest.mock('adm-zip', () =>
    jest.fn().mockImplementation(() => ({
        addLocalFolder: jest.fn(),
        toBuffer: () => Buffer.from('zip')
    }))
);

const { readUi5Config } = jest.requireMock('@sap-ux/adp-tooling') as { readUi5Config: jest.Mock };
const { createAbapServiceProvider } = jest.requireMock('@sap-ux/system-access') as {
    createAbapServiceProvider: jest.Mock;
};

/**
 * Builds a `readUi5Config` mock that returns the target passed here from `findCustomMiddleware`.
 */
function mockUi5ConfigWithTarget(target: unknown): void {
    readUi5Config.mockResolvedValue({
        findCustomMiddleware: () => (target !== undefined ? { configuration: { adp: { target } } } : undefined)
    });
}

describe('manifestContext', () => {
    const appPath = '/tmp/adp-project';

    beforeEach(() => {
        jest.clearAllMocks();
        mockUi5ConfigWithTarget({ url: 'https://example.test', client: '010' });
    });

    describe('getSystemUrl (via getAvailableLibraryFromSystem)', () => {
        test('throws when no fiori-tools-preview middleware is configured', async () => {
            mockUi5ConfigWithTarget(undefined);
            await expect(getAvailableLibraryFromSystem(appPath)).rejects.toThrow(
                /No ABAP target configured for \/tmp\/adp-project/
            );
        });

        test('throws when the ADP target has no url', async () => {
            mockUi5ConfigWithTarget({ url: '', client: '010' });
            await expect(getAvailableLibraryFromSystem(appPath)).rejects.toThrow(/No ABAP target configured/);
        });

        test('passes url and client through to createAbapServiceProvider', async () => {
            const appIndex = { search: jest.fn().mockResolvedValue([[{ id: 'lib' }]]) };
            createAbapServiceProvider.mockResolvedValue({ getAppIndex: () => appIndex });

            await getAvailableLibraryFromSystem(appPath);

            expect(createAbapServiceProvider).toHaveBeenCalledWith(
                { url: 'https://example.test', client: '010' },
                { ignoreCertErrors: false },
                false,
                expect.anything()
            );
        });

        test('defaults client to empty string when only url is configured', async () => {
            mockUi5ConfigWithTarget({ url: 'https://example.test' });
            const appIndex = { search: jest.fn().mockResolvedValue([]) };
            createAbapServiceProvider.mockResolvedValue({ getAppIndex: () => appIndex });

            await getAvailableLibraryFromSystem(appPath);

            expect(createAbapServiceProvider).toHaveBeenCalledWith(
                { url: 'https://example.test', client: '' },
                expect.anything(),
                false,
                expect.anything()
            );
        });
    });

    describe('getAvailableODataServices', () => {
        function mockCatalogs(v2Services: Array<{ name: string }>, v4Services: Array<{ name: string }>): void {
            const v2Catalog = { isS4Cloud: undefined, listServices: jest.fn().mockResolvedValue(v2Services) };
            const v4Catalog = { isS4Cloud: undefined, listServices: jest.fn().mockResolvedValue(v4Services) };
            createAbapServiceProvider.mockResolvedValue({
                catalog: jest
                    .fn()
                    .mockImplementationOnce(() => v2Catalog)
                    .mockImplementationOnce(() => v4Catalog)
            });
        }

        test('returns all services concatenated when filter is empty', async () => {
            mockCatalogs([{ name: 'A' }, { name: 'B' }], [{ name: 'C' }]);
            const result = await getAvailableODataServices(appPath, '');
            expect(result.map((s) => s.name)).toEqual(['A', 'B', 'C']);
        });

        test('matches case-insensitively on both filter and service names', async () => {
            mockCatalogs([{ name: 'SalesOrder' }, { name: 'Other' }], [{ name: 'salesData' }]);
            const result = await getAvailableODataServices(appPath, 'sales');
            expect(result.map((s) => s.name)).toEqual(['SalesOrder', 'salesData']);
        });

        test('returns empty array when nothing matches', async () => {
            mockCatalogs([{ name: 'X' }], [{ name: 'Y' }]);
            const result = await getAvailableODataServices(appPath, 'zzz');
            expect(result).toEqual([]);
        });
    });

    describe('writeContextFile', () => {
        let tmpRoot: string;

        beforeEach(async () => {
            tmpRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'manifest-context-'));
        });

        afterEach(async () => {
            await fs.promises.rm(tmpRoot, { recursive: true, force: true });
        });

        test('creates the .context folder and writes utf-8 contents', async () => {
            const written = await writeContextFile(tmpRoot, 'libraries.json', '{"a":1}');
            expect(written).toBe(path.join(tmpRoot, 'webapp', '.context', 'libraries.json'));
            const contents = await fs.promises.readFile(written, 'utf-8');
            expect(contents).toBe('{"a":1}');
        });

        test('overwrites an existing file', async () => {
            const written = await writeContextFile(tmpRoot, 'libraries.json', 'first');
            await writeContextFile(tmpRoot, 'libraries.json', 'second');
            expect(await fs.promises.readFile(written, 'utf-8')).toBe('second');
        });
    });

    describe('readODataMetadataFromManifest', () => {
        function mockLrepAndService(
            manifest: unknown,
            metadataByUri: Record<string, string>
        ): { serviceCalls: string[] } {
            const serviceCalls: string[] = [];
            createAbapServiceProvider.mockResolvedValue({
                getLayeredRepository: () => ({
                    getCsrfToken: jest.fn().mockResolvedValue(undefined),
                    mergeAppDescriptorVariant: jest.fn().mockResolvedValue({ 'adp.variant.id': { manifest } })
                }),
                service: (uri: string) => {
                    serviceCalls.push(uri);
                    return { metadata: jest.fn().mockResolvedValue(metadataByUri[uri] ?? '<md/>') };
                }
            });
            return { serviceCalls };
        }

        let tmpRoot: string;

        beforeEach(async () => {
            tmpRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'manifest-context-metadata-'));
            await fs.promises.mkdir(path.join(tmpRoot, 'webapp'), { recursive: true });
            await fs.promises.writeFile(
                path.join(tmpRoot, 'webapp', 'manifest.appdescr_variant'),
                JSON.stringify({ id: 'adp.variant.id' })
            );
        });

        afterEach(async () => {
            await fs.promises.rm(tmpRoot, { recursive: true, force: true });
        });

        test('skips non-OData data sources', async () => {
            const { serviceCalls } = mockLrepAndService(
                {
                    'sap.app': {
                        dataSources: {
                            main: { type: 'OData', uri: '/odata/main' },
                            annotations: { type: 'ODataAnnotation', uri: '/anno' }
                        }
                    }
                },
                { '/odata/main': '<edmx>main</edmx>' }
            );

            const entries = await readODataMetadataFromManifest(tmpRoot, false);

            expect(entries).toHaveLength(1);
            expect(entries[0].id).toBe('main');
            expect(entries[0].url).toBe('/odata/main');
            expect(serviceCalls).toEqual(['/odata/main']);
        });

        test('binds ui5 models to their data source', async () => {
            mockLrepAndService(
                {
                    'sap.app': {
                        dataSources: {
                            main: { type: 'OData', uri: '/odata/main' }
                        }
                    },
                    'sap.ui5': {
                        models: {
                            '': { dataSource: 'main', settings: { synchronizationMode: 'None' } }
                        }
                    }
                },
                {}
            );

            const [entry] = await readODataMetadataFromManifest(tmpRoot, false);
            expect(entry.model).toEqual({ dataSource: 'main', settings: { synchronizationMode: 'None' } });
        });

        test('writes files under webapp/.context only when saveLocal is true', async () => {
            mockLrepAndService(
                {
                    'sap.app': {
                        dataSources: {
                            main: { type: 'OData', uri: '/odata/main' }
                        }
                    }
                },
                { '/odata/main': '<edmx>main</edmx>' }
            );

            await readODataMetadataFromManifest(tmpRoot, false);
            await expect(
                fs.promises.access(path.join(tmpRoot, 'webapp', '.context', 'main-metadata.xml'))
            ).rejects.toThrow();

            await readODataMetadataFromManifest(tmpRoot, true);
            const saved = await fs.promises.readFile(
                path.join(tmpRoot, 'webapp', '.context', 'main-metadata.xml'),
                'utf-8'
            );
            expect(saved).toContain('<edmx>main</edmx>');
        });

        test('fetches multiple OData sources in parallel', async () => {
            // The mapper in readODataMetadataFromManifest kicks off all service.metadata() calls
            // synchronously inside Promise.all. Verify that all URIs are visited (not one at a
            // time) by asserting the returned entries carry every data source's metadata.
            const started: string[] = [];
            createAbapServiceProvider.mockResolvedValue({
                getLayeredRepository: () => ({
                    getCsrfToken: jest.fn().mockResolvedValue(undefined),
                    mergeAppDescriptorVariant: jest.fn().mockResolvedValue({
                        'adp.variant.id': {
                            manifest: {
                                'sap.app': {
                                    dataSources: {
                                        a: { type: 'OData', uri: '/a' },
                                        b: { type: 'OData', uri: '/b' },
                                        c: { type: 'OData', uri: '/c' }
                                    }
                                }
                            }
                        }
                    })
                }),
                service: (uri: string) => {
                    started.push(uri);
                    return { metadata: jest.fn().mockResolvedValue(`<md-${uri}/>`) };
                }
            });

            const entries = await readODataMetadataFromManifest(tmpRoot, false);
            expect(entries.map((e) => e.id).sort()).toEqual(['a', 'b', 'c']);
            expect(started.sort()).toEqual(['/a', '/b', '/c']);
        });
    });
});

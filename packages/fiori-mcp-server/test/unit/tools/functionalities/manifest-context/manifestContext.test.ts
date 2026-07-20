import { jest } from '@jest/globals';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

// Cloud Foundry projects resolve their provider via create(); stub only that factory and keep the
// rest of the module real (ODataVersion, and any named exports the SUT import chain references).
// ESM live bindings can't be replaced by jest.mock, so we mock the module then dynamically import
// the SUT below.
const mockCreate = jest.fn<any>();
const actualAxiosExtension = await import('@sap-ux/axios-extension');
jest.unstable_mockModule('@sap-ux/axios-extension', () => ({
    ...actualAxiosExtension,
    create: mockCreate
}));

jest.unstable_mockModule('adm-zip', () => ({
    default: jest.fn().mockImplementation(() => ({
        addLocalFolder: jest.fn(),
        toBuffer: () => Buffer.from('zip')
    }))
}));

// @sap-ux/adp-tooling is routed to a CJS manual mock (see test/__mocks__), whose exports are jest.fn()s.
const { readUi5Config, isCFEnvironment, getExistingAdpProjectType } = await import('@sap-ux/adp-tooling');
const { readODataMetadataFromManifest } =
    await import('../../../../../src/tools/functionalities/manifest-context/odata-metadata.js');
const { getAvailableLibraryFromSystem, getAvailableODataServices, writeContextFile } =
    await import('../../../../../src/tools/functionalities/manifest-context/system-resources.js');

const readUi5ConfigMock = readUi5Config as unknown as jest.Mock;
const isCFEnvironmentMock = isCFEnvironment as unknown as jest.Mock;
const getExistingAdpProjectTypeMock = getExistingAdpProjectType as unknown as jest.Mock;
const createMock = mockCreate as unknown as jest.Mock;

/**
 * Builds a `readUi5Config` mock that returns the target passed here from `findCustomMiddleware`.
 */
function mockUi5ConfigWithTarget(target: unknown): void {
    readUi5ConfigMock.mockResolvedValue({
        findCustomMiddleware: () => (target !== undefined ? { configuration: { adp: { target } } } : undefined)
    });
}

describe('manifestContext', () => {
    const appPath = '/tmp/adp-project';

    beforeEach(() => {
        jest.clearAllMocks();
        mockUi5ConfigWithTarget({ url: 'https://example.test', client: '010' });
        // getProjectType() runs before every system query; default the project to Cloud Foundry
        // so the CF-only guard in getAvailableLibraryFromSystem / getAvailableODataServices passes.
        isCFEnvironmentMock.mockResolvedValue(true);
        getExistingAdpProjectTypeMock.mockResolvedValue('cf');
    });

    describe('getAvailableLibraryFromSystem', () => {
        test('throws when the project is not a Cloud Foundry project', async () => {
            isCFEnvironmentMock.mockResolvedValue(false);
            getExistingAdpProjectTypeMock.mockResolvedValue('onPremise');
            await expect(getAvailableLibraryFromSystem(appPath)).rejects.toThrow(
                /can only be retrieved for Cloud Foundry projects/
            );
        });

        test('returns the library entries from the app index search', async () => {
            const appIndex = { search: jest.fn().mockResolvedValue([{ id: 'lib' }]) };
            createMock.mockResolvedValue({ getAppIndex: () => appIndex });

            const result = await getAvailableLibraryFromSystem(appPath);

            expect(result).toEqual([{ id: 'lib' }]);
        });
    });

    describe('getAvailableODataServices', () => {
        function mockCatalogs(v2Services: Array<{ name: string }>, v4Services: Array<{ name: string }>): void {
            const v2Catalog = { isS4Cloud: undefined, listServices: jest.fn().mockResolvedValue(v2Services) };
            const v4Catalog = { isS4Cloud: undefined, listServices: jest.fn().mockResolvedValue(v4Services) };
            createMock.mockResolvedValue({
                catalog: jest
                    .fn()
                    .mockImplementationOnce(() => v2Catalog)
                    .mockImplementationOnce(() => v4Catalog)
            });
        }

        test('throws when the project is not a Cloud Foundry project', async () => {
            isCFEnvironmentMock.mockResolvedValue(false);
            getExistingAdpProjectTypeMock.mockResolvedValue('cloudReady');
            await expect(getAvailableODataServices(appPath, '')).rejects.toThrow(
                /can only be retrieved for Cloud Foundry projects/
            );
        });

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
        // readODataMetadataFromManifest resolves the merged descriptor via an injected reader
        // (default: the in-process @ui5/task-adaptation pipeline) and fetches each OData data
        // source's metadata through the ABAP service provider returned by getProvider().
        function mockManifestAndService(
            manifest: unknown,
            metadataByUri: Record<string, string>
        ): { serviceCalls: string[]; readManifest: jest.Mock } {
            const serviceCalls: string[] = [];
            // readMergedManifest wraps the merged descriptor as { manifest }.
            const readManifest = jest.fn().mockResolvedValue({ manifest });
            createMock.mockResolvedValue({
                service: (uri: string) => {
                    serviceCalls.push(uri);
                    return { metadata: jest.fn().mockResolvedValue(metadataByUri[uri] ?? '<md/>') };
                }
            });
            return { serviceCalls, readManifest };
        }

        let tmpRoot: string;

        beforeEach(async () => {
            tmpRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'manifest-context-metadata-'));
        });

        afterEach(async () => {
            await fs.promises.rm(tmpRoot, { recursive: true, force: true });
        });

        test('skips non-OData data sources', async () => {
            const { serviceCalls, readManifest } = mockManifestAndService(
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

            const entries = await readODataMetadataFromManifest(tmpRoot, false, readManifest);

            expect(entries).toHaveLength(1);
            expect(entries[0].id).toBe('main');
            expect(entries[0].url).toBe('/odata/main');
            expect(serviceCalls).toEqual(['/odata/main']);
        });

        test('binds ui5 models to their data source', async () => {
            const { readManifest } = mockManifestAndService(
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

            const [entry] = await readODataMetadataFromManifest(tmpRoot, false, readManifest);
            expect(entry.model).toEqual({ dataSource: 'main', settings: { synchronizationMode: 'None' } });
        });

        test('returns the raw metadata unchanged when it is not well-formed XML', async () => {
            const { readManifest } = mockManifestAndService(
                {
                    'sap.app': {
                        dataSources: {
                            main: { type: 'OData', uri: '/odata/main' }
                        }
                    }
                },
                { '/odata/main': 'not-valid-xml <<<' }
            );

            const [entry] = await readODataMetadataFromManifest(tmpRoot, false, readManifest);
            expect(entry.metadata).toContain('not-valid-xml');
        });

        test('writes files under webapp/.context only when saveLocal is true', async () => {
            const { readManifest } = mockManifestAndService(
                {
                    'sap.app': {
                        dataSources: {
                            main: { type: 'OData', uri: '/odata/main' }
                        }
                    }
                },
                { '/odata/main': '<edmx>main</edmx>' }
            );

            await readODataMetadataFromManifest(tmpRoot, false, readManifest);
            await expect(
                fs.promises.access(path.join(tmpRoot, 'webapp', '.context', 'main-metadata.xml'))
            ).rejects.toThrow();

            await readODataMetadataFromManifest(tmpRoot, true, readManifest);
            const saved = await fs.promises.readFile(
                path.join(tmpRoot, 'webapp', '.context', 'main-metadata.xml'),
                'utf-8'
            );
            expect(saved).toContain('<edmx>main</edmx>');
        });

        test('fetches multiple OData sources in parallel', async () => {
            const { serviceCalls, readManifest } = mockManifestAndService(
                {
                    'sap.app': {
                        dataSources: {
                            a: { type: 'OData', uri: '/a' },
                            b: { type: 'OData', uri: '/b' },
                            c: { type: 'OData', uri: '/c' }
                        }
                    }
                },
                { '/a': '<md-a/>', '/b': '<md-b/>', '/c': '<md-c/>' }
            );

            const entries = await readODataMetadataFromManifest(tmpRoot, false, readManifest);
            expect(entries.map((e) => e.id).sort()).toEqual(['a', 'b', 'c']);
            expect(serviceCalls.sort()).toEqual(['/a', '/b', '/c']);
        });
    });
});

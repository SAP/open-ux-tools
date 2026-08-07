import { jest } from '@jest/globals';

// Mock dependencies
const mockGetExternalServiceReferences = jest.fn<any>();
const mockCreateForDestination = jest.fn<any>();
const mockCreateAbapServiceProvider = jest.fn<any>();
const mockFindSystem = jest.fn<any>();
const mockGetAnnotations = jest.fn<any>();
const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
};

// Mock AbapServiceProvider class
class MockAbapServiceProvider {
    fetchExternalServices = jest.fn<any>();
    catalog = jest.fn<any>(() => ({ getAnnotations: mockGetAnnotations }));
}

jest.unstable_mockModule('@sap-ux/odata-service-writer', () => ({
    getExternalServiceReferences: mockGetExternalServiceReferences
}));

jest.unstable_mockModule('@sap-ux/axios-extension', () => ({
    AbapServiceProvider: MockAbapServiceProvider,
    createForDestination: mockCreateForDestination,
    ExternalService: class {},
    ServiceProvider: class {},
    ODataVersion: { v2: '2', v4: '4' }
}));

jest.unstable_mockModule('../../../src/tools/services/sap-system', () => ({
    createAbapServiceProvider: mockCreateAbapServiceProvider,
    findSystem: mockFindSystem
}));

jest.unstable_mockModule('../../../src/utils', () => ({
    logger: mockLogger,
    checkIfGeneratorInstalled: jest.fn<any>().mockResolvedValue(undefined),
    runCmd: jest.fn<any>().mockResolvedValue({ stdout: 'ok', stderr: '' }),
    validateWithSchema: jest.fn().mockImplementation((_schema: any, data: any) => data)
}));

const mockParse = jest.fn<any>();
jest.unstable_mockModule('../../../src/tools/schemas/index', () => ({
    generatorConfigOData: { parse: mockParse },
    PREDEFINED_GENERATOR_VALUES: {
        project: {}
    }
}));

const mockWriteFile = jest.fn<any>().mockResolvedValue(undefined);
const mockMkdir = jest.fn<any>().mockResolvedValue(undefined);
const mockReadFile = jest.fn<any>().mockResolvedValue('<edmx/>');
const mockUnlink = jest.fn<any>().mockResolvedValue(undefined);
const mockExistsSync = jest.fn<any>().mockReturnValue(false);

jest.unstable_mockModule('node:fs', () => ({
    existsSync: mockExistsSync,
    promises: { readFile: mockReadFile, mkdir: mockMkdir, writeFile: mockWriteFile, unlink: mockUnlink }
}));

// Import the module under test after all mocks are set up
const { generateFioriAppOData } = await import('../../../src/tools/generate-fiori-app-odata.js');

describe('generateFioriAppOData - External Services', () => {
    const validArgs = {
        floorplan: 'FE_LROP' as const,
        project: { name: 'myapp', description: 'Test app', targetFolder: '/project', ui5Version: '1.120.0' },
        service: {
            host: 'https://example.com',
            servicePath: '/sap/opu/odata/sap/MY_SERVICE/',
            client: '100'
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockParse.mockReturnValue(validArgs);
        mockGetExternalServiceReferences.mockReturnValue([]);
        // Safe defaults for the annotation fetch (runs whenever host/destination is set)
        mockReadFile.mockResolvedValue('<edmx/>');
        mockFindSystem.mockResolvedValue({ system: undefined });
        mockGetAnnotations.mockResolvedValue([]);
    });

    describe('External service fetching - happy paths', () => {
        test('should fetch external services when references are found and system is available', async () => {
            // Given: External service references exist
            const mockRefs = [
                { type: 'value-list', serviceRootPath: '/sap/opu/odata/sap/MY_SERVICE/', target: 'Product' }
            ];
            mockGetExternalServiceReferences.mockReturnValue(mockRefs);

            // And: System is found and provider is created
            const mockSystem = { url: 'https://example.com', client: '100' };
            mockFindSystem.mockResolvedValue({ system: mockSystem });

            const mockProvider = new MockAbapServiceProvider();
            const mockExternalServices = [
                { name: 'ValueHelp1', path: '/sap/opu/odata/sap/HELP/', metadata: '<edmx/>' }
            ];
            mockProvider.fetchExternalServices.mockResolvedValue(mockExternalServices);
            mockCreateAbapServiceProvider.mockReturnValue(mockProvider);

            // When: Generating the app
            const result = await generateFioriAppOData(validArgs);

            // Then: External services should be fetched
            expect(mockGetExternalServiceReferences).toHaveBeenCalledWith(validArgs.service.servicePath, '<edmx/>', []);
            expect(mockFindSystem).toHaveBeenCalled();
            expect(mockProvider.fetchExternalServices).toHaveBeenCalledWith(mockRefs);
            expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Found 1 external service reference'));
            expect(mockLogger.info).toHaveBeenCalledWith(
                expect.stringContaining('Successfully fetched 1 external service')
            );
            expect(result.status).toBe('Success');
        });

        test('should fetch external services using destination when provided', async () => {
            // Given: Args with destination instead of host+client
            const argsWithDestination = {
                ...validArgs,
                service: {
                    host: 'https://example.com',
                    servicePath: '/sap/opu/odata/sap/MY_SERVICE/',
                    destination: 'MyDestination'
                }
            };
            mockParse.mockReturnValue(argsWithDestination);

            const mockRefs = [{ type: 'value-list', serviceRootPath: '/sap/opu/odata/sap/MY_SERVICE/' }];
            mockGetExternalServiceReferences.mockReturnValue(mockRefs);

            const mockProvider = new MockAbapServiceProvider();
            mockProvider.fetchExternalServices.mockResolvedValue([]);
            mockCreateForDestination.mockResolvedValue(mockProvider);

            // When: Generating the app
            await generateFioriAppOData(argsWithDestination);

            // Then: createForDestination should be used
            expect(mockCreateForDestination).toHaveBeenCalledWith(
                {},
                { Name: 'MyDestination', WebIDEUsage: 'odata_abap' }
            );
            expect(mockFindSystem).not.toHaveBeenCalled();
        });

        test('should include client in URL when provided', async () => {
            // Given: Args with client
            const mockRefs = [{ type: 'value-list' }];
            mockGetExternalServiceReferences.mockReturnValue(mockRefs);

            const mockSystem = { url: 'https://example.com', client: '100' };
            mockFindSystem.mockResolvedValue({ system: mockSystem });

            const mockProvider = new MockAbapServiceProvider();
            mockProvider.fetchExternalServices.mockResolvedValue([]);
            mockCreateAbapServiceProvider.mockReturnValue(mockProvider);

            // When: Generating the app
            await generateFioriAppOData(validArgs);

            // Then: findSystem should be called with URL including client
            const callArg = mockFindSystem.mock.calls[0][0];
            expect(callArg).toContain('sap-client=100');
        });

        test('should use host directly without sap-client when client is not provided', async () => {
            // Given: Args with host but no client
            const argsWithoutClient = {
                ...validArgs,
                service: {
                    host: 'https://example.com',
                    servicePath: '/sap/opu/odata/sap/MY_SERVICE/'
                }
            };
            mockParse.mockReturnValue(argsWithoutClient);

            mockGetExternalServiceReferences.mockReturnValue([{ type: 'value-list' }]);

            const mockSystem = { url: 'https://example.com' };
            mockFindSystem.mockResolvedValue({ system: mockSystem });

            const mockProvider = new MockAbapServiceProvider();
            mockProvider.fetchExternalServices.mockResolvedValue([]);
            mockCreateAbapServiceProvider.mockReturnValue(mockProvider);

            // When: Generating the app
            await generateFioriAppOData(argsWithoutClient);

            // Then: findSystem should be called with the plain host, no sap-client param
            const callArg = mockFindSystem.mock.calls[0][0];
            expect(callArg).toBe('https://example.com');
            expect(callArg).not.toContain('sap-client');
        });
    });

    describe('External service fetching - guard conditions', () => {
        test('should skip external service fetching when neither host nor destination is provided', async () => {
            // Given: Service config with no host and no destination (e.g. local metadata only)
            const argsWithoutSystem = {
                ...validArgs,
                service: {
                    host: '',
                    servicePath: '/sap/opu/odata/sap/MY_SERVICE/'
                }
            };
            mockParse.mockReturnValue(argsWithoutSystem);

            // Even if references would exist, the guard must short-circuit before fetching
            mockGetExternalServiceReferences.mockReturnValue([{ type: 'value-list' }]);

            // When: Generating the app
            const result = await generateFioriAppOData(argsWithoutSystem);

            // Then: External service fetching should not be attempted at all
            expect(mockGetExternalServiceReferences).not.toHaveBeenCalled();
            expect(mockFindSystem).not.toHaveBeenCalled();
            expect(mockCreateForDestination).not.toHaveBeenCalled();
            expect(result.status).toBe('Success');
        });
    });

    describe('External service fetching - no references', () => {
        test('should handle case when no external service references are found', async () => {
            // Given: A reachable ABAP provider but no external service references in the metadata
            const mockSystem = { url: 'https://example.com', client: '100' };
            mockFindSystem.mockResolvedValue({ system: mockSystem });
            mockCreateAbapServiceProvider.mockReturnValue(new MockAbapServiceProvider());
            mockGetExternalServiceReferences.mockReturnValue([]);

            // When: Generating the app
            const result = await generateFioriAppOData(validArgs);

            // Then: Should not attempt to fetch external services (annotations are fetched separately)
            expect(mockLogger.info).toHaveBeenCalledWith('No external service references found in metadata');
            const configContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string);
            expect(configContent.service.externalServices).toBeUndefined();
            expect(result.status).toBe('Success');
        });
    });

    describe('External service fetching - error handling', () => {
        test('should return undefined and log error when system is not found', async () => {
            // Given: External service references exist but system not found
            mockGetExternalServiceReferences.mockReturnValue([{ type: 'value-list' }]);
            mockFindSystem.mockResolvedValue({ system: undefined });

            // When: Generating the app
            const result = await generateFioriAppOData(validArgs);

            // Then: Should log error but continue generation
            expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to find system for host'));
            expect(result.status).toBe('Success'); // App generation should continue
        });

        test('should return undefined and log error when provider is not AbapServiceProvider', async () => {
            // Given: Destination returns non-ABAP provider
            const argsWithDestination = {
                ...validArgs,
                service: { ...validArgs.service, destination: 'MyDestination' }
            };
            mockParse.mockReturnValue(argsWithDestination);

            mockGetExternalServiceReferences.mockReturnValue([{ type: 'value-list' }]);
            mockCreateForDestination.mockResolvedValue({ type: 'OtherProvider' });

            // When: Generating the app
            const result = await generateFioriAppOData(argsWithDestination);

            // Then: Should log error but continue
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Value Help and Code List metadata is only available from ABAP backends'
            );
            expect(result.status).toBe('Success');
        });

        test('should handle fetchExternalServices throwing an error', async () => {
            // Given: Provider throws error when fetching
            mockGetExternalServiceReferences.mockReturnValue([{ type: 'value-list' }]);

            const mockSystem = { url: 'https://example.com', client: '100' };
            mockFindSystem.mockResolvedValue({ system: mockSystem });

            const mockProvider = new MockAbapServiceProvider();
            mockProvider.fetchExternalServices.mockRejectedValue(new Error('Network error'));
            mockCreateAbapServiceProvider.mockReturnValue(mockProvider);

            // When: Generating the app
            const result = await generateFioriAppOData(validArgs);

            // Then: Should log error and warning but continue generation
            expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Network error'));
            expect(mockLogger.warn).toHaveBeenCalledWith(
                'App will be generated without external service metadata (value help and code lists)'
            );
            expect(result.status).toBe('Success'); // Graceful degradation
        });

        test('should not throw when external service fetch fails', async () => {
            // Given: External service fetch will fail
            mockGetExternalServiceReferences.mockImplementation(() => {
                throw new Error('Parse error');
            });

            // When/Then: Should not throw
            await expect(generateFioriAppOData(validArgs)).resolves.toBeDefined();
        });

        test('should generate gracefully when the service provider cannot be created', async () => {
            // Given: Resolving the stored system throws
            mockGetExternalServiceReferences.mockReturnValue([{ type: 'value-list' }]);
            mockFindSystem.mockRejectedValue(new Error('Connection timeout'));

            // When: Generating the app
            const result = await generateFioriAppOData(validArgs);

            // Then: The error is logged and generation still succeeds (no metadata/annotations)
            expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Connection timeout'));
            expect(mockLogger.warn).toHaveBeenCalledWith(
                'App will be generated without backend service metadata and annotations'
            );
            expect(result.status).toBe('Success');
        });
    });

    describe('Integration scenarios', () => {
        test('should generate app successfully even when external services fetch fails', async () => {
            // Given: External service fetch will fail
            mockGetExternalServiceReferences.mockImplementation(() => {
                throw new Error('Metadata parse error');
            });

            // When: Generating the app
            const result = await generateFioriAppOData(validArgs);

            // Then: App should still be generated successfully
            expect(result.status).toBe('Success');
            expect(result.message).toContain('Generation completed successfully');
        });

        test('should write generator config with externalServices when fetch succeeds', async () => {
            // Given: Successful external service fetch
            const mockRefs = [{ type: 'value-list' }];
            mockGetExternalServiceReferences.mockReturnValue(mockRefs);

            const mockSystem = { url: 'https://example.com', client: '100' };
            mockFindSystem.mockResolvedValue({ system: mockSystem });

            const mockProvider = new MockAbapServiceProvider();
            const mockExternalServices = [{ name: 'ValueHelp1', metadata: '<edmx/>' }];
            mockProvider.fetchExternalServices.mockResolvedValue(mockExternalServices);
            mockCreateAbapServiceProvider.mockReturnValue(mockProvider);

            // When: Generating the app
            await generateFioriAppOData(validArgs);

            // Then: Config should include external services
            expect(mockWriteFile).toHaveBeenCalled();
            const configContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string);
            expect(configContent.service.externalServices).toEqual(mockExternalServices);
        });

        test('should handle undefined external services gracefully', async () => {
            // Given: No external services
            mockGetExternalServiceReferences.mockReturnValue([]);

            // When: Generating the app
            await generateFioriAppOData(validArgs);

            // Then: Config should have undefined external services
            expect(mockWriteFile).toHaveBeenCalled();
            const configContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string);
            expect(configContent.service.externalServices).toBeUndefined();
        });

        test('should log performance metrics when external services are fetched', async () => {
            // Given: Successful fetch
            mockGetExternalServiceReferences.mockReturnValue([{ type: 'value-list' }]);

            const mockSystem = { url: 'https://example.com', client: '100' };
            mockFindSystem.mockResolvedValue({ system: mockSystem });

            const mockProvider = new MockAbapServiceProvider();
            mockProvider.fetchExternalServices.mockResolvedValue([{ name: 'Help1' }]);
            mockCreateAbapServiceProvider.mockReturnValue(mockProvider);

            // When: Generating the app
            await generateFioriAppOData(validArgs);

            // Then: Should log performance info
            expect(mockLogger.info).toHaveBeenCalledWith(expect.stringMatching(/in \d+ms$/));
        });
    });

    describe('Service annotation fetching', () => {
        const anno = (name: string) => ({
            TechnicalName: name,
            Version: '0001',
            Definitions: `<edmx:Edmx>${name}</edmx:Edmx>`,
            Uri: `/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='${name}',Version='0001')/$value/`
        });

        test('should write the first backend annotation into the generator config (V2)', async () => {
            // Given: A V2 service whose catalog returns two annotations
            mockFindSystem.mockResolvedValue({ system: { url: 'https://example.com' } });
            const mockProvider = new MockAbapServiceProvider();
            mockCreateAbapServiceProvider.mockReturnValue(mockProvider);
            const annoA = anno('MY_SERVICE_ANNO_MDL');
            mockGetAnnotations.mockResolvedValue([annoA, anno('SECOND_ANNO')]);

            // When: Generating the app
            await generateFioriAppOData(validArgs);

            // Then: The catalog is queried by service path and only the first annotation is written
            expect(mockGetAnnotations).toHaveBeenCalledWith({ path: validArgs.service.servicePath });
            const configContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string);
            expect(configContent.service.annotations).toEqual(annoA);
        });

        test('should leave annotations undefined when the catalog returns none (V2)', async () => {
            // Given: A V2 service with no annotations
            mockFindSystem.mockResolvedValue({ system: { url: 'https://example.com' } });
            mockCreateAbapServiceProvider.mockReturnValue(new MockAbapServiceProvider());
            mockGetAnnotations.mockResolvedValue([]);

            // When: Generating the app
            await generateFioriAppOData(validArgs);

            // Then: No annotations are written
            const configContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string);
            expect(configContent.service.annotations).toBeUndefined();
        });

        test('should not query the catalog for V4 metadata (annotations are inline)', async () => {
            // Given: V4 metadata
            mockReadFile.mockResolvedValue('<edmx:Edmx Version="4.0"></edmx:Edmx>');
            mockFindSystem.mockResolvedValue({ system: { url: 'https://example.com' } });
            mockCreateAbapServiceProvider.mockReturnValue(new MockAbapServiceProvider());

            // When: Generating the app
            const result = await generateFioriAppOData(validArgs);

            // Then: The catalog annotations endpoint is not called and none are written
            expect(mockGetAnnotations).not.toHaveBeenCalled();
            const configContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string);
            expect(configContent.service.annotations).toBeUndefined();
            expect(result.status).toBe('Success');
        });

        test('should generate successfully when annotation fetching fails (offline-graceful)', async () => {
            // Given: A V2 service whose catalog request throws
            mockFindSystem.mockResolvedValue({ system: { url: 'https://example.com' } });
            mockCreateAbapServiceProvider.mockReturnValue(new MockAbapServiceProvider());
            mockGetAnnotations.mockRejectedValue(new Error('Catalog unavailable'));

            // When: Generating the app
            const result = await generateFioriAppOData(validArgs);

            // Then: Generation still succeeds without annotations
            expect(mockLogger.warn).toHaveBeenCalledWith('App will be generated without backend service annotations');
            const configContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string);
            expect(configContent.service.annotations).toBeUndefined();
            expect(result.status).toBe('Success');
        });

        test('should create the ABAP service provider only once and reuse it for external services and annotations', async () => {
            // Given: A V2 service with BOTH external service references and backend annotations
            mockGetExternalServiceReferences.mockReturnValue([{ type: 'value-list' }]);
            mockFindSystem.mockResolvedValue({ system: { url: 'https://example.com' } });
            const mockProvider = new MockAbapServiceProvider();
            mockProvider.fetchExternalServices.mockResolvedValue([{ name: 'Help1', metadata: '<edmx/>' }]);
            mockCreateAbapServiceProvider.mockReturnValue(mockProvider);
            const annoA = anno('MY_SERVICE_ANNO_MDL');
            mockGetAnnotations.mockResolvedValue([annoA]);

            // When: Generating the app
            await generateFioriAppOData(validArgs);

            // Then: The system lookup and provider creation happen exactly once (single connection,
            // so a cloud backend only prompts for interactive auth once)
            expect(mockFindSystem).toHaveBeenCalledTimes(1);
            expect(mockCreateAbapServiceProvider).toHaveBeenCalledTimes(1);
            // And both consumers used that same provider instance
            expect(mockProvider.fetchExternalServices).toHaveBeenCalledWith([{ type: 'value-list' }]);
            expect(mockGetAnnotations).toHaveBeenCalledWith({ path: validArgs.service.servicePath });
            const configContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string);
            expect(configContent.service.externalServices).toEqual([{ name: 'Help1', metadata: '<edmx/>' }]);
            expect(configContent.service.annotations).toEqual(annoA);
        });
    });
});

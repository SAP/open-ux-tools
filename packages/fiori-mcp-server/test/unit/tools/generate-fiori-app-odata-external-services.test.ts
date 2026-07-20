import { jest } from '@jest/globals';

// Mock dependencies
const mockGetExternalServiceReferences = jest.fn<any>();
const mockCreateForDestination = jest.fn<any>();
const mockCreateAbapServiceProvider = jest.fn<any>();
const mockFindSystem = jest.fn<any>();
const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
};

// Mock AbapServiceProvider class
class MockAbapServiceProvider {
    fetchExternalServices = jest.fn<any>();
}

jest.unstable_mockModule('@sap-ux/odata-service-writer', () => ({
    getExternalServiceReferences: mockGetExternalServiceReferences
}));

jest.unstable_mockModule('@sap-ux/axios-extension', () => ({
    AbapServiceProvider: MockAbapServiceProvider,
    createForDestination: mockCreateForDestination,
    ExternalService: class {},
    ServiceProvider: class {}
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
    });

    describe('External service fetching - no references', () => {
        test('should handle case when no external service references are found', async () => {
            // Given: No external service references
            mockGetExternalServiceReferences.mockReturnValue([]);

            // When: Generating the app
            const result = await generateFioriAppOData(validArgs);

            // Then: Should not attempt to fetch
            expect(mockFindSystem).not.toHaveBeenCalled();
            expect(mockCreateForDestination).not.toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith('No external service references found in metadata');
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
                expect.stringContaining('Error fetching external service metadata')
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

        test('should log error with duration when fetch fails', async () => {
            // Given: Fetch will fail
            mockGetExternalServiceReferences.mockReturnValue([{ type: 'value-list' }]);
            mockFindSystem.mockRejectedValue(new Error('Connection timeout'));

            // When: Generating the app
            await generateFioriAppOData(validArgs);

            // Then: Error log should include duration
            expect(mockLogger.error).toHaveBeenCalledWith(expect.stringMatching(/after \d+ms:/));
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
});

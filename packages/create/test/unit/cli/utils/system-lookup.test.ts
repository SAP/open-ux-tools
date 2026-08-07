import { jest } from '@jest/globals';
import type { BackendSystem, Service, BackendSystemKey } from '@sap-ux/store';

const mockGetLogger = jest.fn() as jest.Mock;
const mockSetLogLevelVerbose = jest.fn() as jest.Mock;
jest.unstable_mockModule('../../../../src/tracing/logger', () => ({
    getLogger: mockGetLogger,
    setLogLevelVerbose: mockSetLogLevelVerbose
}));

// Mock i18n
jest.unstable_mockModule('../../../../src/i18n.js', () => ({
    text: (key: string, options?: Record<string, unknown>) => {
        const translations: Record<string, string> = {
            'systemLookup.multipleSystemsFound': 'Multiple systems found with this URL:',
            'systemLookup.selectSystemPrompt': 'Which system do you want to use?',
            'systemLookup.clientInfo': '(Client: {{client}})',
            'systemLookup.noClient': '(No Client)'
        };
        let result = translations[key] || key;
        if (options) {
            Object.entries(options).forEach(([k, v]) => {
                result = result.replace(`{{${k}}}`, String(v));
            });
        }
        return result;
    },
    initI18n: jest.fn().mockResolvedValue(undefined)
}));

// Mock prompts
const mockPrompts = jest.fn().mockResolvedValue({});
jest.unstable_mockModule('prompts', () => ({
    default: mockPrompts
}));

const { findSystemByUrl } = await import('../../../../src/cli/utils/system-lookup.js');

describe('system-lookup', () => {
    const mockService = {
        read: jest.fn<any>().mockResolvedValue(undefined),
        write: jest.fn<any>().mockResolvedValue(undefined),
        delete: jest.fn<any>().mockResolvedValue(true),
        getAll: jest.fn<any>().mockResolvedValue([]),
        partialUpdate: jest.fn<any>().mockResolvedValue(undefined)
    } as unknown as Service<BackendSystem, BackendSystemKey>;

    const mockLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockGetLogger.mockReturnValue(mockLogger);
        mockService.read = jest.fn<any>().mockResolvedValue(undefined);
        mockService.getAll = jest.fn<any>().mockResolvedValue([]);
        mockPrompts.mockResolvedValue({});
    });

    describe('findSystemByUrl', () => {
        test('should return system when exact match found (with client provided)', async () => {
            // Given - multiple systems with same URL
            const systems = [
                { name: 'My System', url: 'https://example.com', client: '100' } as BackendSystem,
                { name: 'Other System', url: 'https://example.com', client: '200' } as BackendSystem
            ];
            mockService.getAll = jest.fn<any>().mockResolvedValue(systems);

            // When - search with specific client
            const result = await findSystemByUrl('https://example.com', '100', mockService);

            // Then - returns exact match
            expect(result).toBe(systems[0]);
            expect(mockService.getAll).toHaveBeenCalledTimes(1);
        });

        test('should normalize URL by removing trailing slash', async () => {
            // Given
            const systems = [{ name: 'My System', url: 'https://example.com', client: '100' } as BackendSystem];
            mockService.getAll = jest.fn<any>().mockResolvedValue(systems);

            // When - URL with trailing slash
            const result = await findSystemByUrl('https://example.com/', '100', mockService);

            // Then - normalized URL matches system
            expect(result).toBe(systems[0]);
            expect(mockService.getAll).toHaveBeenCalledTimes(1);
        });

        test('should return undefined when no systems found', async () => {
            // Given
            mockService.read = jest.fn<any>().mockResolvedValue(undefined);
            mockService.getAll = jest.fn<any>().mockResolvedValue([]);

            // When
            const result = await findSystemByUrl('https://notfound.com', '100', mockService);

            // Then
            expect(result).toBeUndefined();
            expect(mockService.getAll).toHaveBeenCalledTimes(1);
        });

        test('should return single system when only one matches by URL', async () => {
            // Given
            mockService.read = jest.fn<any>().mockResolvedValue(undefined);
            const singleSystem = {
                name: 'Single System',
                url: 'https://example.com',
                client: '200'
            } as BackendSystem;
            mockService.getAll = jest.fn<any>().mockResolvedValue([singleSystem]);

            // When
            const result = await findSystemByUrl('https://example.com', '100', mockService);

            // Then
            expect(result).toBe(singleSystem);
            expect(mockPrompts).not.toHaveBeenCalled();
        });

        test('should prompt user when multiple systems match by URL', async () => {
            // Given
            mockService.read = jest.fn<any>().mockResolvedValue(undefined);
            const system1 = {
                name: 'System 1',
                url: 'https://example.com',
                client: '100'
            } as BackendSystem;
            const system2 = {
                name: 'System 2',
                url: 'https://example.com',
                client: '200'
            } as BackendSystem;
            mockService.getAll = jest.fn<any>().mockResolvedValue([system1, system2]);
            mockPrompts.mockResolvedValueOnce({ index: 0 });

            // When
            const result = await findSystemByUrl('https://example.com', undefined, mockService);

            // Then
            expect(result).toBe(system1);
            expect(mockPrompts).toHaveBeenCalledTimes(1);
            expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Multiple systems found'));
        });

        test('should return undefined when user cancels selection', async () => {
            // Given
            mockService.read = jest.fn<any>().mockResolvedValue(undefined);
            const system1 = {
                name: 'System 1',
                url: 'https://example.com',
                client: '100'
            } as BackendSystem;
            const system2 = {
                name: 'System 2',
                url: 'https://example.com',
                client: '200'
            } as BackendSystem;
            mockService.getAll = jest.fn<any>().mockResolvedValue([system1, system2]);
            mockPrompts.mockResolvedValueOnce({}); // User cancelled (no index)

            // When
            const result = await findSystemByUrl('https://example.com', undefined, mockService);

            // Then
            expect(result).toBeUndefined();
        });

        test('should handle systems with no client', async () => {
            // Given
            mockService.read = jest.fn<any>().mockResolvedValue(undefined);
            const system1 = {
                name: 'System 1',
                url: 'https://example.com'
            } as BackendSystem;
            const system2 = {
                name: 'System 2',
                url: 'https://example.com',
                client: '100'
            } as BackendSystem;
            mockService.getAll = jest.fn<any>().mockResolvedValue([system1, system2]);
            mockPrompts.mockResolvedValueOnce({ index: 1 });

            // When
            const result = await findSystemByUrl('https://example.com', undefined, mockService);

            // Then
            expect(result).toBe(system2);
            expect(mockPrompts).toHaveBeenCalledWith(
                expect.objectContaining({
                    choices: expect.arrayContaining([
                        expect.objectContaining({ title: expect.stringContaining('(No Client)') }),
                        expect.objectContaining({ title: expect.stringContaining('(Client: 100)') })
                    ])
                })
            );
        });

        test('should filter systems by normalized URL', async () => {
            // Given
            mockService.read = jest.fn<any>().mockResolvedValue(undefined);
            const matchingSystem = {
                name: 'Match',
                url: 'https://example.com/',
                client: '100'
            } as BackendSystem;
            const nonMatchingSystem = {
                name: 'No Match',
                url: 'https://other.com',
                client: '100'
            } as BackendSystem;
            mockService.getAll = jest.fn<any>().mockResolvedValue([matchingSystem, nonMatchingSystem]);

            // When
            const result = await findSystemByUrl('https://example.com', undefined, mockService);

            // Then
            expect(result).toBe(matchingSystem);
            expect(mockPrompts).not.toHaveBeenCalled();
        });

        test('should select second system when user chooses index 1', async () => {
            // Given
            mockService.read = jest.fn<any>().mockResolvedValue(undefined);
            const system1 = {
                name: 'System 1',
                url: 'https://example.com',
                client: '100'
            } as BackendSystem;
            const system2 = {
                name: 'System 2',
                url: 'https://example.com',
                client: '200'
            } as BackendSystem;
            mockService.getAll = jest.fn<any>().mockResolvedValue([system1, system2]);
            mockPrompts.mockResolvedValueOnce({ index: 1 });

            // When
            const result = await findSystemByUrl('https://example.com', undefined, mockService);

            // Then
            expect(result).toBe(system2);
        });
    });
});

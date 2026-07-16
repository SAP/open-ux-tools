import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import type prompts from 'prompts';
import { SystemType, AuthenticationType, ConnectionType } from '@sap-ux/store';
import type { BackendSystem, BackendSystemKey } from '@sap-ux/store';

const mockPrompts = jest.fn() as unknown as typeof prompts;
const mockGetService = jest.fn();
const mockGetAll = jest.fn();
const mockIsSystemNameTaken = jest.fn();
const mockValidateClient = jest.fn();

jest.unstable_mockModule('prompts', () => ({ default: mockPrompts }));
jest.unstable_mockModule('@sap-ux/store', () => ({
    SystemType,
    AuthenticationType,
    ConnectionType,
    getService: mockGetService
}));
jest.unstable_mockModule('@sap-ux/inquirer-common', () => ({
    isSystemNameTaken: mockIsSystemNameTaken
}));
jest.unstable_mockModule('@sap-ux/project-input-validator', () => ({
    validateClient: mockValidateClient
}));

const {
    promptForSystemConfig,
    promptForSystemIdentifier,
    promptForUpdateFields,
    promptForFieldUpdates,
    promptForRemoveConfirmation
} = await import('../../../../src/cli/utils/system-prompts.js');

describe('system-prompts', () => {
    beforeEach(() => {
        mockPrompts.mockReset();
        mockGetService.mockReset();
        mockGetAll.mockReset();
        mockIsSystemNameTaken.mockReset();
        mockValidateClient.mockReset();

        // Default mock implementations
        mockIsSystemNameTaken.mockResolvedValue(false);
        mockValidateClient.mockReturnValue(true);
    });

    describe('promptForSystemConfig', () => {
        test('should return config without prompting if all fields provided', async () => {
            const partial = {
                name: 'TestSystem',
                url: 'https://test.example.com',
                client: '100',
                systemType: 'OnPrem',
                authenticationType: 'basic',
                connectionType: 'abap_catalog',
                username: 'user',
                password: 'pass'
            };

            const result = await promptForSystemConfig(partial);

            expect(result).toEqual(partial);
            expect(mockPrompts).not.toHaveBeenCalled();
        });

        test('should prompt for missing name', async () => {
            mockPrompts.mockResolvedValueOnce({ name: 'PromptedName' });

            const result = await promptForSystemConfig({
                url: 'https://test.example.com',
                systemType: 'OnPrem',
                authenticationType: 'basic',
                connectionType: 'abap_catalog'
            });

            expect(result.name).toBe('PromptedName');
            expect(mockPrompts).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        type: 'text',
                        name: 'name',
                        message: 'System name (display name):'
                    })
                ])
            );
        });

        test('should prompt for missing url', async () => {
            mockPrompts.mockResolvedValueOnce({ url: 'https://prompted.example.com' });

            const result = await promptForSystemConfig({
                name: 'Test',
                systemType: 'OnPrem',
                authenticationType: 'basic',
                connectionType: 'abap_catalog'
            });

            expect(result.url).toBe('https://prompted.example.com');
            expect(mockPrompts).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        type: 'text',
                        name: 'url',
                        message: 'System URL:'
                    })
                ])
            );
        });

        test('should prompt for missing client', async () => {
            mockPrompts.mockResolvedValueOnce({ client: '200' });

            const result = await promptForSystemConfig({
                name: 'Test',
                url: 'https://test.example.com',
                systemType: 'OnPrem',
                authenticationType: 'basic',
                connectionType: 'abap_catalog'
            });

            expect(result.client).toBe('200');
            expect(mockPrompts).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        type: 'text',
                        name: 'client',
                        message: 'SAP client (optional, press Enter to skip):'
                    })
                ])
            );
        });

        test('should prompt for missing systemType with choices', async () => {
            mockPrompts.mockResolvedValueOnce({ systemType: SystemType.AbapCloud });

            const result = await promptForSystemConfig({
                name: 'Test',
                url: 'https://test.example.com',
                authenticationType: 'basic',
                connectionType: 'abap_catalog'
            });

            expect(result.systemType).toBe(SystemType.AbapCloud);
            const calls = mockPrompts.mock.calls;
            const promptsCall = calls[0][0];
            const systemTypePrompt = Array.isArray(promptsCall)
                ? promptsCall.find((p: any) => p.name === 'systemType')
                : undefined;

            expect(systemTypePrompt).toBeDefined();
            expect(systemTypePrompt.type).toBe('select');
            expect(systemTypePrompt.name).toBe('systemType');
            expect(systemTypePrompt.message).toBe('System type:');
            expect(systemTypePrompt.choices).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ value: 'OnPrem' }),
                    expect.objectContaining({ value: 'AbapCloud' }),
                    expect.objectContaining({ value: 'Generic' })
                ])
            );
        });

        test('should prompt for missing authenticationType with choices', async () => {
            mockPrompts.mockResolvedValueOnce({ authenticationType: AuthenticationType.ReentranceTicket });

            const result = await promptForSystemConfig({
                name: 'Test',
                url: 'https://test.example.com',
                systemType: 'OnPrem',
                connectionType: 'abap_catalog'
            });

            expect(result.authenticationType).toBe(AuthenticationType.ReentranceTicket);
            expect(mockPrompts).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        type: 'select',
                        name: 'authenticationType',
                        message: 'Authentication type:'
                    })
                ])
            );
        });

        test('should prompt for missing connectionType with choices', async () => {
            mockPrompts.mockResolvedValueOnce({ connectionType: ConnectionType.ODataService });

            const result = await promptForSystemConfig({
                name: 'Test',
                url: 'https://test.example.com',
                systemType: 'OnPrem',
                authenticationType: 'basic'
            });

            expect(result.connectionType).toBe(ConnectionType.ODataService);
            expect(mockPrompts).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        type: 'select',
                        name: 'connectionType',
                        message: 'Connection type:'
                    })
                ])
            );
        });

        test('should prompt for missing username', async () => {
            mockPrompts.mockResolvedValueOnce({ username: 'prompted-user' });

            const result = await promptForSystemConfig({
                name: 'Test',
                url: 'https://test.example.com',
                systemType: 'OnPrem',
                authenticationType: 'basic',
                connectionType: 'abap_catalog'
            });

            expect(result.username).toBe('prompted-user');
            expect(mockPrompts).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        type: 'text',
                        name: 'username',
                        message: 'Username (optional, press Enter to skip):'
                    })
                ])
            );
        });

        test('should prompt for missing password', async () => {
            mockPrompts.mockResolvedValueOnce({ password: 'prompted-pass' });

            const result = await promptForSystemConfig({
                name: 'Test',
                url: 'https://test.example.com',
                systemType: 'OnPrem',
                authenticationType: 'basic',
                connectionType: 'abap_catalog'
            });

            expect(result.password).toBe('prompted-pass');
            expect(mockPrompts).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        type: 'password',
                        name: 'password',
                        message: 'Password (optional, press Enter to skip):'
                    })
                ])
            );
        });

        test('should handle empty client as undefined', async () => {
            mockPrompts.mockResolvedValueOnce({ client: '' });

            const result = await promptForSystemConfig({
                name: 'Test',
                url: 'https://test.example.com',
                systemType: 'OnPrem',
                authenticationType: 'basic',
                connectionType: 'abap_catalog'
            });

            expect(result.client).toBeUndefined();
        });

        test('should handle empty username as undefined', async () => {
            mockPrompts.mockResolvedValueOnce({ username: '' });

            const result = await promptForSystemConfig({
                name: 'Test',
                url: 'https://test.example.com',
                systemType: 'OnPrem',
                authenticationType: 'basic',
                connectionType: 'abap_catalog'
            });

            expect(result.username).toBeUndefined();
        });

        test('should handle empty password as undefined', async () => {
            mockPrompts.mockResolvedValueOnce({ password: '' });

            const result = await promptForSystemConfig({
                name: 'Test',
                url: 'https://test.example.com',
                systemType: 'OnPrem',
                authenticationType: 'basic',
                connectionType: 'abap_catalog'
            });

            expect(result.password).toBeUndefined();
        });

        test('should prompt for all missing fields', async () => {
            mockPrompts.mockResolvedValueOnce({
                name: 'FullSystem',
                url: 'https://full.example.com',
                client: '300',
                systemType: SystemType.OnPrem,
                authenticationType: AuthenticationType.Basic,
                connectionType: ConnectionType.AbapCatalog,
                username: 'fulluser',
                password: 'fullpass'
            });

            const result = await promptForSystemConfig({});

            expect(result).toEqual({
                name: 'FullSystem',
                url: 'https://full.example.com',
                client: '300',
                systemType: SystemType.OnPrem,
                authenticationType: AuthenticationType.Basic,
                connectionType: ConnectionType.AbapCatalog,
                username: 'fulluser',
                password: 'fullpass'
            });
        });

        test('should preserve provided client even if empty string', async () => {
            mockPrompts.mockResolvedValueOnce({});

            const result = await promptForSystemConfig({
                name: 'Test',
                url: 'https://test.example.com',
                client: '',
                systemType: 'OnPrem',
                authenticationType: 'basic',
                connectionType: 'abap_catalog',
                username: 'user',
                password: 'pass'
            });

            expect(result.client).toBe('');
        });

        test('should preserve provided username even if empty string', async () => {
            mockPrompts.mockResolvedValueOnce({});

            const result = await promptForSystemConfig({
                name: 'Test',
                url: 'https://test.example.com',
                systemType: 'OnPrem',
                authenticationType: 'basic',
                connectionType: 'abap_catalog',
                username: '',
                password: 'pass'
            });

            expect(result.username).toBe('');
        });

        test('should preserve provided password even if empty string', async () => {
            mockPrompts.mockResolvedValueOnce({});

            const result = await promptForSystemConfig({
                name: 'Test',
                url: 'https://test.example.com',
                systemType: 'OnPrem',
                authenticationType: 'basic',
                connectionType: 'abap_catalog',
                username: 'user',
                password: ''
            });

            expect(result.password).toBe('');
        });
    });

    describe('validation functions', () => {
        describe('name validation with uniqueness check', () => {
            test('should validate name uniqueness when prompting for new system name', async () => {
                const existingSystems: BackendSystem[] = [
                    {
                        name: 'Existing System',
                        url: 'https://existing.com',
                        client: '100',
                        systemType: SystemType.OnPrem,
                        authenticationType: AuthenticationType.Basic,
                        connectionType: ConnectionType.AbapCatalog
                    }
                ];

                mockGetService.mockResolvedValue({ getAll: mockGetAll });
                mockGetAll.mockResolvedValue(existingSystems);
                mockPrompts.mockResolvedValueOnce({ name: 'New System' });

                await promptForSystemConfig({
                    url: 'https://test.com',
                    systemType: 'OnPrem',
                    authenticationType: 'basic',
                    connectionType: 'abap_catalog'
                });

                const calls = mockPrompts.mock.calls;
                const promptsCall = calls[0][0];
                const namePrompt = Array.isArray(promptsCall)
                    ? promptsCall.find((p: any) => p.name === 'name')
                    : undefined;

                expect(namePrompt).toBeDefined();
                expect(namePrompt.validate).toBeDefined();

                // Test the validate function allows unique names
                const validResult = await namePrompt.validate('New System');
                expect(validResult).toBe(true);
            });

            test('should reject duplicate system name (case-insensitive)', async () => {
                const existingSystems: BackendSystem[] = [
                    {
                        name: 'Existing System',
                        url: 'https://existing.com',
                        systemType: SystemType.OnPrem,
                        authenticationType: AuthenticationType.Basic,
                        connectionType: ConnectionType.AbapCatalog
                    }
                ];

                mockGetService.mockResolvedValue({ getAll: mockGetAll });
                mockGetAll.mockResolvedValue(existingSystems);
                mockIsSystemNameTaken.mockResolvedValue(true); // Mock that name is taken
                mockPrompts.mockResolvedValueOnce({ name: 'New System' });

                await promptForSystemConfig({
                    url: 'https://test.com',
                    systemType: 'OnPrem',
                    authenticationType: 'basic',
                    connectionType: 'abap_catalog'
                });

                const calls = mockPrompts.mock.calls;
                const promptsCall = calls[0][0];
                const namePrompt = Array.isArray(promptsCall)
                    ? promptsCall.find((p: any) => p.name === 'name')
                    : undefined;

                // Test the validate function rejects duplicate names
                const duplicateResult = await namePrompt.validate('existing system');
                expect(duplicateResult).toBe(
                    "A system with the name 'existing system' already exists. Please choose a different name."
                );
            });

            test('should reject empty system name', async () => {
                mockGetService.mockResolvedValue({ getAll: mockGetAll });
                mockGetAll.mockResolvedValue([]);
                mockPrompts.mockResolvedValueOnce({ name: 'Valid Name' });

                await promptForSystemConfig({
                    url: 'https://test.com',
                    systemType: 'OnPrem',
                    authenticationType: 'basic',
                    connectionType: 'abap_catalog'
                });

                const calls = mockPrompts.mock.calls;
                const promptsCall = calls[0][0];
                const namePrompt = Array.isArray(promptsCall)
                    ? promptsCall.find((p: any) => p.name === 'name')
                    : undefined;

                // Test empty name rejection
                const emptyResult = await namePrompt.validate('');
                expect(emptyResult).toBe('This field is required and cannot be empty');
            });

            test('should reject whitespace-only system name', async () => {
                mockGetService.mockResolvedValue({ getAll: mockGetAll });
                mockGetAll.mockResolvedValue([]);
                mockPrompts.mockResolvedValueOnce({ name: 'Valid Name' });

                await promptForSystemConfig({
                    url: 'https://test.com',
                    systemType: 'OnPrem',
                    authenticationType: 'basic',
                    connectionType: 'abap_catalog'
                });

                const calls = mockPrompts.mock.calls;
                const promptsCall = calls[0][0];
                const namePrompt = Array.isArray(promptsCall)
                    ? promptsCall.find((p: any) => p.name === 'name')
                    : undefined;

                // Test whitespace-only name rejection
                const whitespaceResult = await namePrompt.validate('   ');
                expect(whitespaceResult).toBe('This field is required and cannot be empty');
            });

            test('should reject on service error (prevent duplicate names)', async () => {
                mockIsSystemNameTaken.mockRejectedValue(new Error('Service unavailable'));
                mockPrompts.mockResolvedValueOnce({ name: 'System Name' });

                await promptForSystemConfig({
                    url: 'https://test.com',
                    systemType: 'OnPrem',
                    authenticationType: 'basic',
                    connectionType: 'abap_catalog'
                });

                const calls = mockPrompts.mock.calls;
                const promptsCall = calls[0][0];
                const namePrompt = Array.isArray(promptsCall)
                    ? promptsCall.find((p: any) => p.name === 'name')
                    : undefined;

                // Should return error message if service is unavailable (prevent duplicate names)
                const result = await namePrompt.validate('System Name');
                expect(typeof result).toBe('string');
                expect(result).toContain('Unable to check system name uniqueness');
            });
        });

        describe('URL validation', () => {
            test('should validate URL format when prompting for URL', async () => {
                mockPrompts.mockResolvedValueOnce({ url: 'https://valid.com' });

                await promptForSystemConfig({
                    name: 'Test',
                    systemType: 'OnPrem',
                    authenticationType: 'basic',
                    connectionType: 'abap_catalog'
                });

                const calls = mockPrompts.mock.calls;
                const promptsCall = calls[0][0];
                const urlPrompt = Array.isArray(promptsCall)
                    ? promptsCall.find((p: any) => p.name === 'url')
                    : undefined;

                expect(urlPrompt).toBeDefined();
                expect(urlPrompt.validate).toBeDefined();

                // Test valid URL
                const validResult = urlPrompt.validate('https://valid-url.com');
                expect(validResult).toBe(true);
            });

            test('should reject invalid URL format', async () => {
                mockPrompts.mockResolvedValueOnce({ url: 'https://valid.com' });

                await promptForSystemConfig({
                    name: 'Test',
                    systemType: 'OnPrem',
                    authenticationType: 'basic',
                    connectionType: 'abap_catalog'
                });

                const calls = mockPrompts.mock.calls;
                const promptsCall = calls[0][0];
                const urlPrompt = Array.isArray(promptsCall)
                    ? promptsCall.find((p: any) => p.name === 'url')
                    : undefined;

                // Test invalid URL
                const invalidResult = urlPrompt.validate('not-a-valid-url');
                expect(invalidResult).toBe('Please enter a valid URL (e.g., https://my-system.example.com)');
            });

            test('should reject empty URL', async () => {
                mockPrompts.mockResolvedValueOnce({ url: 'https://valid.com' });

                await promptForSystemConfig({
                    name: 'Test',
                    systemType: 'OnPrem',
                    authenticationType: 'basic',
                    connectionType: 'abap_catalog'
                });

                const calls = mockPrompts.mock.calls;
                const promptsCall = calls[0][0];
                const urlPrompt = Array.isArray(promptsCall)
                    ? promptsCall.find((p: any) => p.name === 'url')
                    : undefined;

                // Test empty URL
                const emptyResult = urlPrompt.validate('');
                expect(emptyResult).toBe('This field is required and cannot be empty');
            });
        });

        describe('update name validation with uniqueness check', () => {
            test('should allow updating to same name (excluding current system)', async () => {
                const currentSystem: BackendSystem = {
                    name: 'Current System',
                    url: 'https://current.com',
                    client: '100',
                    systemType: SystemType.OnPrem,
                    authenticationType: AuthenticationType.Basic,
                    connectionType: ConnectionType.AbapCatalog
                };

                const allSystems: BackendSystem[] = [
                    currentSystem,
                    {
                        name: 'Other System',
                        url: 'https://other.com',
                        systemType: SystemType.OnPrem,
                        authenticationType: AuthenticationType.Basic,
                        connectionType: ConnectionType.AbapCatalog
                    }
                ];

                mockGetService.mockResolvedValue({ getAll: mockGetAll });
                mockGetAll.mockResolvedValue(allSystems);
                mockIsSystemNameTaken.mockResolvedValue(false); // Same name is allowed for current system
                mockPrompts.mockResolvedValueOnce({ name: 'Current System' });

                await promptForFieldUpdates(['name'], currentSystem);

                const calls = mockPrompts.mock.calls;
                const promptsCall = calls[0][0];
                const namePrompt = Array.isArray(promptsCall)
                    ? promptsCall.find((p: any) => p.name === 'name')
                    : undefined;

                expect(namePrompt).toBeDefined();
                expect(namePrompt.validate).toBeDefined();

                // Should allow keeping the same name
                const sameNameResult = await namePrompt.validate('Current System');
                expect(sameNameResult).toBe(true);
            });

            test('should reject updating to another existing system name', async () => {
                const currentSystem: BackendSystem = {
                    name: 'Current System',
                    url: 'https://current.com',
                    client: '100',
                    systemType: SystemType.OnPrem,
                    authenticationType: AuthenticationType.Basic,
                    connectionType: ConnectionType.AbapCatalog
                };

                const allSystems: BackendSystem[] = [
                    currentSystem,
                    {
                        name: 'Other System',
                        url: 'https://other.com',
                        systemType: SystemType.OnPrem,
                        authenticationType: AuthenticationType.Basic,
                        connectionType: ConnectionType.AbapCatalog
                    }
                ];

                mockGetService.mockResolvedValue({ getAll: mockGetAll });
                mockGetAll.mockResolvedValue(allSystems);
                mockIsSystemNameTaken.mockResolvedValue(true); // Other System name is taken
                mockPrompts.mockResolvedValueOnce({ name: 'Updated Name' });

                await promptForFieldUpdates(['name'], currentSystem);

                const calls = mockPrompts.mock.calls;
                const promptsCall = calls[0][0];
                const namePrompt = Array.isArray(promptsCall)
                    ? promptsCall.find((p: any) => p.name === 'name')
                    : undefined;

                // Should reject duplicate name
                const duplicateResult = await namePrompt.validate('Other System');
                expect(duplicateResult).toBe(
                    "A system with the name 'Other System' already exists. Please choose a different name."
                );
            });

            test('should allow updating to a new unique name', async () => {
                const currentSystem: BackendSystem = {
                    name: 'Current System',
                    url: 'https://current.com',
                    systemType: SystemType.OnPrem,
                    authenticationType: AuthenticationType.Basic,
                    connectionType: ConnectionType.AbapCatalog
                };

                mockGetService.mockResolvedValue({ getAll: mockGetAll });
                mockGetAll.mockResolvedValue([currentSystem]);
                mockIsSystemNameTaken.mockResolvedValue(false); // Allow new unique name
                mockPrompts.mockResolvedValueOnce({ name: 'New Unique Name' });

                await promptForFieldUpdates(['name'], currentSystem);

                const calls = mockPrompts.mock.calls;
                const promptsCall = calls[0][0];
                const namePrompt = Array.isArray(promptsCall)
                    ? promptsCall.find((p: any) => p.name === 'name')
                    : undefined;

                // Should allow new unique name
                const uniqueResult = await namePrompt.validate('New Unique Name');
                expect(uniqueResult).toBe(true);
            });
        });

        describe('username and password validation', () => {
            test('should validate non-empty username when updating', async () => {
                const currentSystem: BackendSystem = {
                    name: 'Test System',
                    url: 'https://test.com',
                    systemType: SystemType.OnPrem,
                    authenticationType: AuthenticationType.Basic,
                    connectionType: ConnectionType.AbapCatalog,
                    username: 'olduser'
                };

                mockPrompts.mockResolvedValueOnce({ username: 'newuser' });

                await promptForFieldUpdates(['username'], currentSystem);

                const calls = mockPrompts.mock.calls;
                const promptsCall = calls[0][0];
                const usernamePrompt = Array.isArray(promptsCall)
                    ? promptsCall.find((p: any) => p.name === 'username')
                    : undefined;

                expect(usernamePrompt).toBeDefined();
                expect(usernamePrompt.validate).toBeDefined();

                // Test valid username
                const validResult = usernamePrompt.validate('newuser');
                expect(validResult).toBe(true);

                // Test empty username
                const emptyResult = usernamePrompt.validate('');
                expect(emptyResult).toBe('This field is required and cannot be empty');

                // Test whitespace-only username
                const whitespaceResult = usernamePrompt.validate('   ');
                expect(whitespaceResult).toBe('This field is required and cannot be empty');
            });

            test('should validate non-empty password when updating', async () => {
                const currentSystem: BackendSystem = {
                    name: 'Test System',
                    url: 'https://test.com',
                    systemType: SystemType.OnPrem,
                    authenticationType: AuthenticationType.Basic,
                    connectionType: ConnectionType.AbapCatalog
                };

                mockPrompts.mockResolvedValueOnce({ password: 'newpass' });

                await promptForFieldUpdates(['password'], currentSystem);

                const calls = mockPrompts.mock.calls;
                const promptsCall = calls[0][0];
                const passwordPrompt = Array.isArray(promptsCall)
                    ? promptsCall.find((p: any) => p.name === 'password')
                    : undefined;

                expect(passwordPrompt).toBeDefined();
                expect(passwordPrompt.validate).toBeDefined();

                // Test valid password
                const validResult = passwordPrompt.validate('newpass');
                expect(validResult).toBe(true);

                // Test empty password
                const emptyResult = passwordPrompt.validate('');
                expect(emptyResult).toBe('This field is required and cannot be empty');
            });
        });

        describe('URL validation in system identifier', () => {
            test('should validate URL when prompting for system identifier', async () => {
                mockPrompts.mockResolvedValueOnce({ url: 'https://test.com' });

                await promptForSystemIdentifier({ client: '100' });

                const calls = mockPrompts.mock.calls;
                const promptsCall = calls[0][0];
                const urlPrompt = Array.isArray(promptsCall)
                    ? promptsCall.find((p: any) => p.name === 'url')
                    : undefined;

                expect(urlPrompt).toBeDefined();
                expect(urlPrompt.validate).toBeDefined();

                // Test valid URL
                const validResult = urlPrompt.validate('https://valid.com');
                expect(validResult).toBe(true);

                // Test invalid URL
                const invalidResult = urlPrompt.validate('invalid');
                expect(invalidResult).toBe('Please enter a valid URL (e.g., https://my-system.example.com)');
            });
        });
    });

    describe('promptForSystemIdentifier', () => {
        test('should return identifier without prompting if all fields provided', async () => {
            const partial = {
                url: 'https://test.example.com',
                client: '100'
            };

            const result = await promptForSystemIdentifier(partial);

            expect(result).toEqual(partial);
            expect(mockPrompts).not.toHaveBeenCalled();
        });

        test('should prompt for missing url', async () => {
            mockPrompts.mockResolvedValueOnce({ url: 'https://prompted.example.com' });

            const result = await promptForSystemIdentifier({ client: '100' });

            expect(result.url).toBe('https://prompted.example.com');
            expect(result.client).toBe('100');
        });

        test('should prompt for missing client', async () => {
            mockPrompts.mockResolvedValueOnce({ client: '200' });

            const result = await promptForSystemIdentifier({ url: 'https://test.example.com' });

            expect(result.url).toBe('https://test.example.com');
            expect(result.client).toBe('200');
        });

        test('should prompt for both url and client', async () => {
            mockPrompts.mockResolvedValueOnce({
                url: 'https://both.example.com',
                client: '300'
            });

            const result = await promptForSystemIdentifier({});

            expect(result.url).toBe('https://both.example.com');
            expect(result.client).toBe('300');
        });

        test('should handle empty client as undefined', async () => {
            mockPrompts.mockResolvedValueOnce({ client: '' });

            const result = await promptForSystemIdentifier({ url: 'https://test.example.com' });

            expect(result.client).toBeUndefined();
        });

        test('should preserve provided empty client', async () => {
            mockPrompts.mockResolvedValueOnce({});

            const result = await promptForSystemIdentifier({
                url: 'https://test.example.com',
                client: ''
            });

            expect(result.client).toBe('');
        });
    });

    describe('promptForUpdateFields', () => {
        const mockSystem: BackendSystem = {
            name: 'ExistingSystem',
            url: 'https://existing.example.com',
            client: '100',
            systemType: SystemType.OnPrem,
            authenticationType: AuthenticationType.Basic,
            connectionType: ConnectionType.AbapCatalog,
            username: 'existing-user'
        };

        test('should prompt with current values and return selected fields', async () => {
            mockPrompts.mockResolvedValueOnce({ fields: ['name', 'username'] });

            const result = await promptForUpdateFields(mockSystem);

            expect(result).toEqual(['name', 'username']);
            expect(mockPrompts).toHaveBeenCalledWith({
                type: 'multiselect',
                name: 'fields',
                message: 'Select fields to update:',
                choices: [
                    { title: 'Name (current: ExistingSystem)', value: 'name' },
                    { title: 'Username (current: existing-user)', value: 'username' },
                    { title: 'Password', value: 'password' }
                ],
                min: 1
            });
        });

        test('should show "(none)" for missing username', async () => {
            const systemWithoutUsername = { ...mockSystem, username: undefined };
            mockPrompts.mockResolvedValueOnce({ fields: ['name'] });

            await promptForUpdateFields(systemWithoutUsername);

            expect(mockPrompts).toHaveBeenCalledWith(
                expect.objectContaining({
                    choices: expect.arrayContaining([expect.objectContaining({ title: 'Username (current: (none))' })])
                })
            );
        });

        test('should throw error if no fields selected', async () => {
            mockPrompts.mockResolvedValueOnce({ fields: [] });

            await expect(promptForUpdateFields(mockSystem)).rejects.toThrow('At least one field must be selected');
        });

        test('should throw error if user cancels prompt', async () => {
            mockPrompts.mockResolvedValueOnce({});

            await expect(promptForUpdateFields(mockSystem)).rejects.toThrow('At least one field must be selected');
        });
    });

    describe('promptForFieldUpdates', () => {
        const mockSystem: BackendSystem = {
            name: 'ExistingSystem',
            url: 'https://existing.example.com',
            systemType: SystemType.OnPrem,
            authenticationType: AuthenticationType.Basic,
            connectionType: ConnectionType.AbapCatalog,
            username: 'existing-user'
        };

        test('should prompt for name update', async () => {
            mockPrompts.mockResolvedValueOnce({ name: 'NewName' });

            const result = await promptForFieldUpdates(['name'], mockSystem);

            expect(result.name).toBe('NewName');
            const calls = mockPrompts.mock.calls;
            const promptsCall = calls[0][0];
            const namePrompt = Array.isArray(promptsCall) ? promptsCall.find((p: any) => p.name === 'name') : undefined;

            expect(namePrompt).toBeDefined();
            expect(namePrompt.type).toBe('text');
            expect(namePrompt.message).toBe('New system name:');
            expect(namePrompt.initial).toBe('ExistingSystem');
        });

        test('should prompt for username update', async () => {
            mockPrompts.mockResolvedValueOnce({ username: 'NewUser' });

            const result = await promptForFieldUpdates(['username'], mockSystem);

            expect(result.username).toBe('NewUser');
            const calls = mockPrompts.mock.calls;
            const promptsCall = calls[0][0];
            const usernamePrompt = Array.isArray(promptsCall)
                ? promptsCall.find((p: any) => p.name === 'username')
                : undefined;

            expect(usernamePrompt).toBeDefined();
            expect(usernamePrompt.type).toBe('text');
            expect(usernamePrompt.message).toBe('New username:');
            expect(usernamePrompt.initial).toBe('existing-user');
        });

        test('should prompt for password update', async () => {
            mockPrompts.mockResolvedValueOnce({ password: 'NewPassword' });

            const result = await promptForFieldUpdates(['password'], mockSystem);

            expect(result.password).toBe('NewPassword');
            const calls = mockPrompts.mock.calls;
            const promptsCall = calls[0][0];
            const passwordPrompt = Array.isArray(promptsCall)
                ? promptsCall.find((p: any) => p.name === 'password')
                : undefined;

            expect(passwordPrompt).toBeDefined();
            expect(passwordPrompt.type).toBe('password');
            expect(passwordPrompt.message).toBe('New password:');
        });

        test('should prompt for multiple fields', async () => {
            mockPrompts.mockResolvedValueOnce({
                name: 'UpdatedName',
                username: 'UpdatedUser',
                password: 'UpdatedPass'
            });

            const result = await promptForFieldUpdates(['name', 'username', 'password'], mockSystem);

            expect(result).toEqual({
                name: 'UpdatedName',
                username: 'UpdatedUser',
                password: 'UpdatedPass'
            });
        });

        test('should handle empty username with empty string initial', async () => {
            const systemWithoutUsername = { ...mockSystem, username: undefined };
            mockPrompts.mockResolvedValueOnce({ username: 'NewUser' });

            await promptForFieldUpdates(['username'], systemWithoutUsername);

            const calls = mockPrompts.mock.calls;
            const promptsCall = calls[0][0];
            const usernamePrompt = Array.isArray(promptsCall)
                ? promptsCall.find((p: any) => p.name === 'username')
                : undefined;

            expect(usernamePrompt.initial).toBe('');
        });

        test('should filter out unknown fields', async () => {
            mockPrompts.mockResolvedValueOnce({ name: 'NewName' });

            await promptForFieldUpdates(['name', 'unknown-field' as any], mockSystem);

            const calls = mockPrompts.mock.calls;
            const promptsCall = calls[0][0];
            const prompts = Array.isArray(promptsCall) ? promptsCall : [];

            expect(prompts).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'name' })]));
            expect(prompts.find((p: any) => p.name === 'unknown-field')).toBeUndefined();
        });

        test('should return empty object for no valid fields', async () => {
            mockPrompts.mockResolvedValueOnce({});

            const result = await promptForFieldUpdates(['unknown' as any], mockSystem);

            expect(result).toEqual({});
        });
    });

    describe('promptForRemoveConfirmation', () => {
        test('should return true when user confirms', async () => {
            mockPrompts.mockResolvedValueOnce({ confirm: true });

            const result = await promptForRemoveConfirmation('TestSystem');

            expect(result).toBe(true);
            expect(mockPrompts).toHaveBeenCalledWith({
                type: 'confirm',
                name: 'confirm',
                message: "Are you sure you want to remove system 'TestSystem'?",
                initial: false
            });
        });

        test('should return false when user declines', async () => {
            mockPrompts.mockResolvedValueOnce({ confirm: false });

            const result = await promptForRemoveConfirmation('TestSystem');

            expect(result).toBe(false);
        });

        test('should return false when user cancels', async () => {
            mockPrompts.mockResolvedValueOnce({});

            const result = await promptForRemoveConfirmation('TestSystem');

            expect(result).toBe(false);
        });

        test('should include system name in prompt message', async () => {
            mockPrompts.mockResolvedValueOnce({ confirm: true });

            await promptForRemoveConfirmation('My Special System');

            expect(mockPrompts).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "Are you sure you want to remove system 'My Special System'?"
                })
            );
        });
    });
});

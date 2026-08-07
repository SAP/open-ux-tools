import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import type prompts from 'prompts';
import { SystemType, AuthenticationType, ConnectionType } from '@sap-ux/store';
import type { BackendSystem, BackendSystemKey } from '@sap-ux/store';

const mockPrompts = jest.fn() as unknown as typeof prompts;
const mockGetService = jest.fn();
const mockGetAll = jest.fn();
const mockSystemNameExists = jest.fn();
const mockValidateClient = jest.fn();

// Mock i18n to return the key as the value (for testing)
jest.unstable_mockModule('../../../../src/i18n.js', () => ({
    text: (key: string, options?: Record<string, unknown>) => {
        // Map i18n keys to updated English strings per PR review
        const translations: Record<string, string> = {
            'systemPrompts.validation.fieldRequired': 'This field is required and cannot be empty',
            'systemPrompts.validation.invalidUrl':
                'Please enter a valid URL, for example https://my-system.example.com',
            'systemPrompts.validation.systemNameExists':
                "A system with the name '{{name}}' already exists. Please choose a different name.",
            'systemPrompts.validation.checkNameFailed': 'Unable to check system name uniqueness. Please try again.',
            'systemPrompts.prompts.systemName': 'System Name:',
            'systemPrompts.prompts.systemUrl': 'System URL:',
            'systemPrompts.prompts.sapClient': 'SAP Client (Optional: Press Enter to Skip):',
            'systemPrompts.prompts.systemType': 'System Type:',
            'systemPrompts.prompts.authenticationType': 'Authentication Type:',
            'systemPrompts.prompts.connectionType': 'Connection Type:',
            'systemPrompts.prompts.username': 'Username (Optional: Press Enter to Skip):',
            'systemPrompts.prompts.password': 'Password (Optional: Press Enter to Skip):',
            'systemPrompts.updateFields.selectPrompt': 'Select Fields to Update:',
            'systemPrompts.updateFields.nameLabel': 'Name (Existing: {{name}})',
            'systemPrompts.updateFields.usernameLabel': 'Username (Existing: {{username}})',
            'systemPrompts.updateFields.usernameNone': '(none)',
            'systemPrompts.updateFields.passwordLabel': 'Password',
            'systemPrompts.updateFields.minOneRequired': 'At least one field must be selected.',
            'systemPrompts.updateFields.newNamePrompt': 'New System Name:',
            'systemPrompts.updateFields.newUsernamePrompt': 'New Username:',
            'systemPrompts.updateFields.newPasswordPrompt': 'New Password:',
            'systemPrompts.updateFields.clearCredentialsLabel': 'Clear Credentials',
            'systemPrompts.updateFields.clearCredentialsConfirm':
                'Are you sure you want to clear all stored credentials?',
            'systemPrompts.removeConfirmation.prompt': "Are you sure you want to remove system '{{systemName}}'?"
        };
        let result = translations[key] || key;
        // Apply interpolation if options provided
        if (options) {
            Object.entries(options).forEach(([k, v]) => {
                result = result.replace(`{{${k}}}`, String(v));
            });
        }
        return result;
    },
    initI18n: jest.fn().mockResolvedValue(undefined)
}));

jest.unstable_mockModule('prompts', () => ({ default: mockPrompts }));
jest.unstable_mockModule('@sap-ux/store', () => ({
    SystemType,
    AuthenticationType,
    ConnectionType,
    getService: mockGetService,
    isSystemNameInUse: mockSystemNameExists
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
        mockSystemNameExists.mockReset();
        mockValidateClient.mockReset();

        // Default mock implementations
        mockSystemNameExists.mockResolvedValue(false);
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
                        message: 'System Name:'
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
                        message: 'SAP Client (Optional: Press Enter to Skip):'
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
            expect(systemTypePrompt.message).toBe('System Type:');
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
                        message: 'Authentication Type:'
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
                        message: 'Connection Type:'
                    })
                ])
            );
        });

        test('should prompt for missing username', async () => {
            mockPrompts
                .mockResolvedValueOnce({}) // First call for basic questions (all provided)
                .mockResolvedValueOnce({ username: 'prompted-user' }); // Second call for credentials

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
                        message: 'Username (Optional: Press Enter to Skip):'
                    })
                ])
            );
        });

        test('should prompt for missing password', async () => {
            mockPrompts
                .mockResolvedValueOnce({}) // First call for basic questions (all provided)
                .mockResolvedValueOnce({ password: 'prompted-pass' }); // Second call for credentials

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
                        message: 'Password (Optional: Press Enter to Skip):'
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
            mockPrompts
                .mockResolvedValueOnce({}) // First call for basic questions
                .mockResolvedValueOnce({ username: '' }); // Second call for credentials

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
            mockPrompts
                .mockResolvedValueOnce({}) // First call for basic questions
                .mockResolvedValueOnce({ password: '' }); // Second call for credentials

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
            mockPrompts
                .mockResolvedValueOnce({
                    name: 'FullSystem',
                    url: 'https://full.example.com',
                    client: '300',
                    systemType: SystemType.OnPrem,
                    authenticationType: AuthenticationType.Basic,
                    connectionType: ConnectionType.AbapCatalog
                })
                .mockResolvedValueOnce({
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

        test('should display message for reentranceTicket auth and skip credential prompts', async () => {
            mockPrompts.mockResolvedValueOnce({
                authenticationType: AuthenticationType.ReentranceTicket
            });

            const result = await promptForSystemConfig({
                name: 'Test',
                url: 'https://test.example.com',
                systemType: SystemType.OnPrem,
                connectionType: ConnectionType.AbapCatalog
            });

            expect(result.authenticationType).toBe(AuthenticationType.ReentranceTicket);
            // Note: The console message for reentranceTicket was removed
            expect(result.username).toBeUndefined();
            expect(result.password).toBeUndefined();
        });

        test('should prompt for credentials only when auth type is basic', async () => {
            mockPrompts
                .mockResolvedValueOnce({
                    authenticationType: AuthenticationType.Basic
                })
                .mockResolvedValueOnce({
                    username: 'testuser',
                    password: 'testpass'
                });

            const result = await promptForSystemConfig({
                name: 'Test',
                url: 'https://test.example.com',
                systemType: SystemType.OnPrem,
                connectionType: ConnectionType.AbapCatalog
            });

            expect(result.authenticationType).toBe(AuthenticationType.Basic);
            expect(result.username).toBe('testuser');
            expect(result.password).toBe('testpass');
            expect(mockPrompts).toHaveBeenCalledTimes(2);
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
                mockSystemNameExists.mockResolvedValue(true); // Mock that name is taken
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
                mockSystemNameExists.mockRejectedValue(new Error('Service unavailable'));
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
                expect(invalidResult).toBe('Please enter a valid URL, for example https://my-system.example.com');
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
                mockSystemNameExists.mockResolvedValue(false); // Same name is allowed for current system
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
                mockSystemNameExists.mockResolvedValue(true); // Other System name is taken
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
                mockSystemNameExists.mockResolvedValue(false); // Allow new unique name
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
                expect(invalidResult).toBe('Please enter a valid URL, for example https://my-system.example.com');
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

        test('should NOT prompt for client when URL is provided (smart lookup will handle it)', async () => {
            // When URL is provided but client is not, we don't prompt for client
            // Instead, we let findSystemByUrl handle multiple matches via smart lookup
            const result = await promptForSystemIdentifier({ url: 'https://test.example.com' });

            expect(result.url).toBe('https://test.example.com');
            expect(result.client).toBeUndefined();
            expect(mockPrompts).not.toHaveBeenCalled(); // No prompts when URL is provided
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
                message: 'Select Fields to Update:',
                choices: [
                    { title: 'Name (Existing: ExistingSystem)', value: 'name' },
                    { title: 'Username (Existing: existing-user)', value: 'username' },
                    { title: 'Password', value: 'password' },
                    { title: 'Clear Credentials', value: 'clearCredentials' }
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
                    choices: expect.arrayContaining([expect.objectContaining({ title: 'Username (Existing: (none))' })])
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
            expect(namePrompt.message).toBe('New System Name:');
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
            expect(usernamePrompt.message).toBe('New Username:');
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
            expect(passwordPrompt.message).toBe('New Password:');
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

        test('should handle clearCredentials selection with confirmation', async () => {
            mockPrompts
                .mockResolvedValueOnce({ confirmClear: true }) // Confirmation prompt
                .mockResolvedValueOnce({ name: 'UpdatedName' }); // Name update prompt

            const result = await promptForFieldUpdates(['clearCredentials', 'name'], mockSystem);

            expect(result).toEqual({
                clearCredentials: true,
                name: 'UpdatedName'
            });
            expect(mockPrompts).toHaveBeenCalledWith({
                type: 'confirm',
                name: 'confirmClear',
                message: 'Are you sure you want to clear all stored credentials?',
                initial: false
            });
        });

        test('should throw error if clearCredentials confirmation is declined', async () => {
            mockPrompts.mockResolvedValueOnce({ confirmClear: false });

            await expect(promptForFieldUpdates(['clearCredentials'], mockSystem)).rejects.toThrow(
                'Clear credentials cancelled'
            );
        });

        test('should return clearCredentials flag when only clearCredentials selected', async () => {
            mockPrompts.mockResolvedValueOnce({ confirmClear: true });

            const result = await promptForFieldUpdates(['clearCredentials'], mockSystem);

            expect(result).toEqual({ clearCredentials: true });
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

    describe('promptForSystemConfig with --no-credentials flag', () => {
        beforeEach(() => {
            mockPrompts.mockClear();
            mockSystemNameExists.mockResolvedValue(false);
        });

        test('should skip credential prompts when noCredentials=true', async () => {
            mockPrompts.mockResolvedValueOnce({
                name: 'Mock System',
                url: 'https://mock.example.com',
                client: '',
                systemType: 'OnPrem',
                authenticationType: 'basic',
                connectionType: 'abap_catalog'
            });

            const result = await promptForSystemConfig({
                noCredentials: true
            });

            expect(result.name).toBe('Mock System');
            expect(result.url).toBe('https://mock.example.com');
            expect(result.authenticationType).toBe('basic');

            // Verify username and password prompts were NOT added
            const calls = mockPrompts.mock.calls;
            const promptsCall = calls[0][0];
            const questions = Array.isArray(promptsCall) ? promptsCall : [];

            const hasUsernamePrompt = questions.some((q: any) => q.name === 'username');
            const hasPasswordPrompt = questions.some((q: any) => q.name === 'password');

            expect(hasUsernamePrompt).toBe(false);
            expect(hasPasswordPrompt).toBe(false);
        });

        test('should skip credential prompts when noCredentials=true even with basic auth', async () => {
            mockPrompts.mockResolvedValueOnce({});

            await promptForSystemConfig({
                name: 'Mock System',
                url: 'https://mock.example.com',
                systemType: 'OnPrem',
                authenticationType: 'basic',
                connectionType: 'abap_catalog',
                noCredentials: true
            });

            // Verify prompts was called with array that doesn't include username/password
            const calls = mockPrompts.mock.calls;
            const promptsCall = calls[0]?.[0];

            if (Array.isArray(promptsCall)) {
                const hasUsernamePrompt = promptsCall.some((q: any) => q.name === 'username');
                const hasPasswordPrompt = promptsCall.some((q: any) => q.name === 'password');

                expect(hasUsernamePrompt).toBe(false);
                expect(hasPasswordPrompt).toBe(false);
            }
        });

        test('should still prompt for credentials when noCredentials=false and auth=basic', async () => {
            mockPrompts
                .mockResolvedValueOnce({}) // First call for basic questions (none needed since all provided)
                .mockResolvedValueOnce({ username: 'testuser', password: 'testpass' }); // Second call for credentials

            await promptForSystemConfig({
                name: 'Regular System',
                url: 'https://regular.example.com',
                systemType: 'OnPrem',
                authenticationType: 'basic',
                connectionType: 'abap_catalog',
                noCredentials: false
            });

            const calls = mockPrompts.mock.calls;
            // Credentials are prompted in the second call
            const credentialPrompts = calls[1]?.[0];

            if (Array.isArray(credentialPrompts)) {
                const hasUsernamePrompt = credentialPrompts.some((q: any) => q.name === 'username');
                const hasPasswordPrompt = credentialPrompts.some((q: any) => q.name === 'password');

                expect(hasUsernamePrompt).toBe(true);
                expect(hasPasswordPrompt).toBe(true);
            }
        });

        test('should skip credential prompts for reentranceTicket auth regardless of noCredentials flag', async () => {
            mockPrompts.mockResolvedValueOnce({});

            await promptForSystemConfig({
                name: 'BTP System',
                url: 'https://btp.example.com',
                systemType: 'AbapCloud',
                authenticationType: 'reentranceTicket',
                connectionType: 'abap_catalog'
                // noCredentials not set - should still skip credentials for reentranceTicket
            });

            const calls = mockPrompts.mock.calls;
            const promptsCall = calls[0]?.[0];

            if (Array.isArray(promptsCall)) {
                const hasUsernamePrompt = promptsCall.some((q: any) => q.name === 'username');
                const hasPasswordPrompt = promptsCall.some((q: any) => q.name === 'password');

                expect(hasUsernamePrompt).toBe(false);
                expect(hasPasswordPrompt).toBe(false);
            }
        });
    });
});

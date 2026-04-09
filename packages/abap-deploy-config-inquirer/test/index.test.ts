import { jest } from '@jest/globals';
import { mockTargetSystems } from './fixtures/targets';
import type { AbapDeployConfigAnswersInternal } from '../src/types';

const mockGetService = jest.fn();

jest.unstable_mockModule('@sap-ux/store', () => ({
    getService: mockGetService,
    AuthenticationType: {},
    BackendSystem: class {},
    BackendSystemKey: class {},
    SystemType: {},
    ConnectionType: {},
    Entity: {},
    TelemetrySetting: class {},
    TelemetrySettingKey: class {},
    ApiHubSettings: class {},
    ApiHubSettingsKey: class {},
    SystemService: class {},
    TelemetrySettingService: class {},
    ApiHubSettingsService: class {},
    SystemMigrationStatus: class {},
    SystemMigrationStatusKey: class {},
    getSecureStore: jest.fn(),
    getBackendSystemType: jest.fn(),
    getFioriToolsDirectory: jest.fn(),
    getSapToolsDirectory: jest.fn(),
    FioriToolsSettings: {},
    SapTools: {},
    getFilesystemWatcherFor: jest.fn()
}));

const { getPrompts, prompt } = await import('../src');

describe('index', () => {
    it('should return prompts from getPrompts', async () => {
        mockGetService.mockResolvedValueOnce({
            getAll: jest.fn().mockResolvedValueOnce([mockTargetSystems])
        });
        const prompts = await getPrompts({}, undefined, false);
        expect(prompts.answers).toBeDefined();
        expect(prompts.prompts.length).toBe(24);
    });

    it('should prompt with inquirer adapter', async () => {
        mockGetService.mockResolvedValueOnce({
            getAll: jest.fn().mockResolvedValueOnce([mockTargetSystems])
        });

        const answers: AbapDeployConfigAnswersInternal = {
            url: '',
            targetSystem: 'https://mock.url.target1.com',
            client: '000',
            package: '',
            ui5AbapRepo: 'mockRepo',
            packageManual: 'mockPackage',
            transportManual: 'mockTransport'
        };

        const adapter = {
            prompt: jest.fn().mockResolvedValueOnce(answers)
        };

        expect(await prompt(adapter)).toStrictEqual({
            url: 'https://mock.url.target1.com',
            client: '000',
            ui5AbapRepo: 'mockRepo',
            package: 'mockPackage',
            transport: 'mockTransport'
        });
    });
});

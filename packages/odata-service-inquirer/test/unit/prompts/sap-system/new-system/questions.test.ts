import { ODataService, type ServiceProvider } from '@sap-ux/axios-extension';
import type { SapSystemType } from '../../../../../src';
import { initI18nOdataServiceInquirer } from '../../../../../src/i18n';
import { getUserSystemNameQuestion } from '../../../../../src/prompts/datasources/sap-system/new-system/questions';
import * as sapSystemValidators from '../../../../../src/prompts/datasources/sap-system/validators';
import { PromptState } from '../../../../../src/utils';
import { ConnectionValidator } from '../../../../../src/prompts/connectionValidator';

jest.mock('@sap-ux/store', () => ({
    __esModule: true, // Workaround to for spyOn TypeError: Jest cannot redefine property
    ...jest.requireActual('@sap-ux/store'),
    SystemService: jest.fn().mockImplementation(() => ({
        getAll: jest.fn().mockResolvedValue([{ name: 'http://abap.on.prem:1234' }])
    }))
}));

describe('Test new system prompt', () => {
    beforeAll(async () => {
        await initI18nOdataServiceInquirer();
    });

    test('Should prompt for system name', async () => {
        const connectValidator = new ConnectionValidator();
        const userSystemNamePrompt = getUserSystemNameQuestion(connectValidator);
        expect(userSystemNamePrompt).toMatchInlineSnapshot(`
            {
              "default": [Function],
              "guiOptions": {
                "applyDefaultWhenDirty": true,
                "breadcrumb": true,
                "hint": "Entering a system name will save the connection for re-use.",
                "mandatory": true,
              },
              "message": "System name",
              "name": "userSystemName",
              "type": "input",
              "validate": [Function],
            }
        `);

        // Test default value, should be undefined where a system connection is not established
        expect(await userSystemNamePrompt.default({})).toBe(undefined);
        // Test default value, should be derived from connected system
        connectValidator.connectedSystemName = 'http://abap.on.prem:1234';
        expect(
            await userSystemNamePrompt.default({
                newSystemType: 'abapOnPrem' as SapSystemType,
                systemUrl: 'http://abap.on.prem:1234'
            })
        ).toBe('http://abap.on.prem:1234 (1)');
    });

    test('Should validate user input system name', async () => {
        const validateSystemName = jest.spyOn(sapSystemValidators, 'validateSystemName');
        const connectValidator = new ConnectionValidator();
        const userSystemNamePrompt = getUserSystemNameQuestion(connectValidator);
        const serviceUrl = 'http://abap.on.prem:1234';

        // Mock store contains a system with the same name
        expect(await (userSystemNamePrompt.validate as Function)(serviceUrl)).toBe(
            'A system with that name already exists in the secure storage. Please try a different name.'
        );
        expect(validateSystemName).toBeCalledWith(serviceUrl);

        // Only connected systems should be stored
        jest.spyOn(ODataService.prototype, 'get').mockResolvedValueOnce({ status: 200 });
        const result = await connectValidator.validateAuth(serviceUrl, 'user01', 'pword01', { sapClient: '999' });
        expect(result).toEqual({ valResult: true }); // Connection is successful

        PromptState.odataService.connectedSystem = {
            serviceProvider: {} as ServiceProvider
        };
        expect(await (userSystemNamePrompt.validate as Function)('http://abap.on.prem:1234 12/08/24')).toBe(true);
        expect(validateSystemName).toBeCalledWith('http://abap.on.prem:1234 12/08/24');

        expect(PromptState.odataService.connectedSystem.backendSystem).toEqual({
            authenticationType: 'basic',
            client: '999',
            name: 'http://abap.on.prem:1234 12/08/24',
            password: 'pword01',
            refreshToken: undefined,
            serviceKeys: undefined,
            url: 'http://abap.on.prem:1234',
            userDisplayName: undefined,
            username: 'user01',
            newOrUpdated: true
        });
    });

    test('Should update prompt state when default system name is used', async () => {
        const connectValidator = new ConnectionValidator();
        // Only connected systems should be stored
        jest.spyOn(ODataService.prototype, 'get').mockResolvedValueOnce({ status: 200 });
        const result = await connectValidator.validateAuth(
            'http://mock.abap.on.prem:4300',
            'testUser',
            'testPassword',
            { sapClient: '000' }
        );
        expect(result).toEqual({ valResult: true }); // Connection is successful

        const userSystemNamePrompt = getUserSystemNameQuestion(connectValidator);

        PromptState.odataService.connectedSystem = {
            serviceProvider: {} as ServiceProvider
        };

        await userSystemNamePrompt.default({
            newSystemType: 'abapOnPrem' as SapSystemType,
            systemUrl: 'http://mock.abap.on.prem:4300',
            sapClient: '000'
        });

        expect(
            await (userSystemNamePrompt.validate as Function)('http://mock.abap.on.prem:4300, client 000', {
                systemUrl: 'http://mock.abap.on.prem:4300',
                sapClient: '000',
                abapSystemUsername: 'testUser',
                abapSystemPassword: 'testPassword'
            })
        ).toBe(true);

        expect(PromptState.odataService.connectedSystem.backendSystem).toEqual({
            authenticationType: 'basic',
            client: '000',
            name: 'http://mock.abap.on.prem:4300, client 000',
            password: 'testPassword',
            refreshToken: undefined,
            serviceKeys: undefined,
            url: 'http://mock.abap.on.prem:4300',
            userDisplayName: undefined,
            username: 'testUser',
            newOrUpdated: true
        });
    });
});

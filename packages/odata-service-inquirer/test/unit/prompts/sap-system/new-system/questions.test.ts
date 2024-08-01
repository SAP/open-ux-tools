import type { ServiceProvider } from '@sap-ux/axios-extension';
import type { SapSystemType } from '../../../../../src';
import { initI18nOdataServiceInquirer } from '../../../../../src/i18n';
import { getUserSystemNameQuestion } from '../../../../../src/prompts/datasources/sap-system/new-system/questions';
import * as sapSystemValidators from '../../../../../src/prompts/datasources/sap-system/validators';
import { PromptState } from '../../../../../src/utils';

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
        const userSystemNamePrompt = getUserSystemNameQuestion();
        expect(userSystemNamePrompt).toMatchInlineSnapshot(`
            {
              "default": [Function],
              "guiOptions": {
                "applyDefaultWhenDirty": true,
                "breadcrumb": true,
                "hint": "Entering a system name will save the connection for re-use.",
              },
              "message": "System name",
              "name": "userSystemName",
              "type": "input",
              "validate": [Function],
            }
        `);

        expect(await userSystemNamePrompt.default({})).toBe(undefined);
        // Test default value, should be derived from system url + stored systems
        expect(
            await userSystemNamePrompt.default({
                newSystemType: 'abapOnPrem' as SapSystemType,
                systemUrl: 'http://abap.on.prem:1234'
            })
        ).toBe('http://abap.on.prem:1234 (1)');
    });

    test('Should validate user input system name', async () => {
        const validateSystemName = jest.spyOn(sapSystemValidators, 'validateSystemName');
        const userSystemNamePrompt = getUserSystemNameQuestion();

        expect(await (userSystemNamePrompt.validate as Function)('http://abap.on.prem:1234')).toBe(
            'A system with that name already exists in the secure storage. Please try a different name.'
        );
        expect(validateSystemName).toBeCalledWith('http://abap.on.prem:1234');

        PromptState.odataService.connectedSystem = {
            serviceProvider: {} as ServiceProvider
        };
        expect(
            await (userSystemNamePrompt.validate as Function)('http://abap.on.prem:1234 12/08/24', {
                systemUrl: 'http://abap.on.prem:1234',
                sapClient: '999',
                abapSystemUsername: 'user01',
                abapSystemPassword: 'pword01'
            })
        ).toBe(true);
        expect(validateSystemName).toBeCalledWith('http://abap.on.prem:1234 12/08/24');
        expect(PromptState.odataService.connectedSystem.backendSystem).toEqual({
            authenticationType: undefined,
            client: '999',
            name: 'http://abap.on.prem:1234 12/08/24',
            password: 'pword01',
            refreshToken: undefined,
            serviceKeys: undefined,
            url: 'http://abap.on.prem:1234',
            userDisplayName: undefined,
            username: 'user01'
        });
    });

    test('Should update prompt state when default system name is used', async () => {
        const userSystemNamePrompt = getUserSystemNameQuestion();

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
            authenticationType: undefined,
            client: '000',
            name: 'http://mock.abap.on.prem:4300, client 000',
            password: 'testPassword',
            refreshToken: undefined,
            serviceKeys: undefined,
            url: 'http://mock.abap.on.prem:4300',
            userDisplayName: undefined,
            username: 'testUser'
        });
    });
});

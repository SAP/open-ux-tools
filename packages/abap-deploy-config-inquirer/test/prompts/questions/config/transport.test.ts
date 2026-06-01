import { jest } from '@jest/globals';
import { promptNames, TransportChoices } from '../../../../src/types.js';
import type { ListQuestion } from '@sap-ux/inquirer-common';

const mockShowTransportInputChoice = jest.fn();
const mockDefaultOrShowTransportCreatedQuestion = jest.fn();
const mockDefaultOrShowTransportListQuestion = jest.fn();
const mockDefaultOrShowManualTransportQuestion = jest.fn();
const mockValidateTransportChoiceInput = jest.fn();
const mockValidateTransportQuestion = jest.fn();

const actualConditions = await import('../../../../src/prompts/conditions.js');
const actualValidators = await import('../../../../src/prompts/validators.js');

jest.unstable_mockModule('../../../../src/prompts/conditions', () => ({
    ...actualConditions,
    showTransportInputChoice: mockShowTransportInputChoice,
    defaultOrShowTransportCreatedQuestion: mockDefaultOrShowTransportCreatedQuestion,
    defaultOrShowTransportListQuestion: mockDefaultOrShowTransportListQuestion,
    defaultOrShowManualTransportQuestion: mockDefaultOrShowManualTransportQuestion
}));

jest.unstable_mockModule('../../../../src/prompts/validators', () => ({
    ...actualValidators,
    validateTransportChoiceInput: mockValidateTransportChoiceInput,
    validateTransportQuestion: mockValidateTransportQuestion
}));

const { initI18n, t } = await import('../../../../src/i18n.js');
const { getTransportRequestPrompts } = await import('../../../../src/prompts/questions/config/transport.js');
const { PromptState } = await import('../../../../src/prompts/prompt-state.js');

describe('getTransportRequestPrompts', () => {
    beforeAll(async () => {
        await initI18n();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return expected prompts', () => {
        const prompts = getTransportRequestPrompts({});
        expect(prompts).toMatchInlineSnapshot(`
            Array [
              Object {
                "choices": [Function],
                "default": [Function],
                "guiOptions": Object {
                  "applyDefaultWhenDirty": true,
                },
                "message": "Select How You Want to Enter the Transport Request",
                "name": "transportInputChoice",
                "type": "list",
                "validate": [Function],
                "when": [Function],
              },
              Object {
                "name": "transportCliExecution",
                "type": "input",
                "when": [Function],
              },
              Object {
                "default": [Function],
                "message": "Created New Transport Request",
                "name": "transportCreated",
                "type": "input",
                "when": [Function],
              },
              Object {
                "choices": [Function],
                "default": [Function],
                "guiOptions": Object {
                  "breadcrumb": "Transport Request",
                  "hint": "Provide a transport request for your application.",
                },
                "message": "Transport Request",
                "name": "transportFromList",
                "type": "list",
                "when": [Function],
              },
              Object {
                "default": [Function],
                "filter": [Function],
                "guiOptions": Object {
                  "breadcrumb": "Transport Request",
                  "hint": "Provide a transport request for your application.",
                  "mandatory": true,
                },
                "message": "Transport Request",
                "name": "transportManual",
                "type": "input",
                "validate": [Function],
                "when": [Function],
              },
            ]
        `);
    });

    test('should return expected values from transportInputChoice prompt methods', async () => {
        mockShowTransportInputChoice.mockReturnValueOnce(true);
        mockValidateTransportChoiceInput.mockResolvedValueOnce(true);

        const transportPrompts = getTransportRequestPrompts({});
        const transportInputChoicePrompt = transportPrompts.find(
            (prompt) => prompt.name === promptNames.transportInputChoice
        );

        if (transportInputChoicePrompt) {
            expect((transportInputChoicePrompt.when as Function)()).toBe(true);
            expect(transportInputChoicePrompt.message).toBe(t('prompts.config.transport.transportInputChoice.message'));
            expect(((transportInputChoicePrompt as ListQuestion).choices as Function)()).toMatchInlineSnapshot(`
                Array [
                  Object {
                    "name": "Enter Manually",
                    "value": "EnterManualChoice",
                  },
                  Object {
                    "name": "Choose from Existing",
                    "value": "ListExistingChoice",
                  },
                  Object {
                    "name": "Create During Deployment",
                    "value": "CreateDuringDeployChoice",
                  },
                  Object {
                    "name": "Create New",
                    "value": "CreateNewChoice",
                  },
                ]
            `);

            expect((transportInputChoicePrompt.default as Function)({})).toBe(TransportChoices.EnterManualChoice);
            expect(await (transportInputChoicePrompt.validate as Function)()).toBe(true);
        }
    });

    test('should return expected values from transportInputChoice prompt methods', async () => {
        mockShowTransportInputChoice.mockReturnValueOnce(true);
        mockValidateTransportChoiceInput.mockResolvedValueOnce(true);

        const transportPrompts = getTransportRequestPrompts({
            transportInputChoice: { showCreateDuringDeploy: false }
        });
        const transportInputChoicePrompt = transportPrompts.find(
            (prompt) => prompt.name === promptNames.transportInputChoice
        );

        if (transportInputChoicePrompt) {
            expect((transportInputChoicePrompt.when as Function)()).toBe(true);
            expect(transportInputChoicePrompt.message).toBe(t('prompts.config.transport.transportInputChoice.message'));
            expect(((transportInputChoicePrompt as ListQuestion).choices as Function)()).toMatchInlineSnapshot(`
                Array [
                  Object {
                    "name": "Enter Manually",
                    "value": "EnterManualChoice",
                  },
                  Object {
                    "name": "Choose from Existing",
                    "value": "ListExistingChoice",
                  },
                  Object {
                    "name": "Create New",
                    "value": "CreateNewChoice",
                  },
                ]
            `);
            mockValidateTransportChoiceInput.mockResolvedValue(true);
            expect((transportInputChoicePrompt.default as Function)({})).toBe(TransportChoices.EnterManualChoice);
            expect(
                await (transportInputChoicePrompt.validate as Function)(TransportChoices.EnterManualChoice, {
                    url: 'http://example.com',
                    client: '100',
                    ui5AbapRepo: 'zabap_repo',
                    description: 'Test description 1'
                })
            ).toBe(true);
            expect(
                await (transportInputChoicePrompt.validate as Function)(TransportChoices.EnterManualChoice, {
                    url: 'http://example.com',
                    client: '100',
                    ui5AbapRepo: 'zabap_repo',
                    description: 'Test description 2'
                })
            ).toBe(true);
            expect(mockValidateTransportChoiceInput).toHaveBeenCalledTimes(1);
        }
    });

    test('should return expected values from transportCliExecution prompt methods', async () => {
        PromptState.isYUI = false;
        const transportPrompts = getTransportRequestPrompts({});
        const transportCliExecutionPrompt = transportPrompts.find(
            (prompt) => prompt.name === promptNames.transportCliExecution
        );

        if (transportCliExecutionPrompt) {
            mockValidateTransportChoiceInput.mockResolvedValueOnce(true);
            expect(await (transportCliExecutionPrompt.when as Function)({})).toBe(false);

            mockValidateTransportChoiceInput.mockResolvedValueOnce('Error with transports');

            try {
                await (transportCliExecutionPrompt.when as Function)({});
                throw new Error('Expected error');
            } catch (e: any) {
                expect(e.message).toBe('Error with transports');
            }
        }
        expect(mockValidateTransportChoiceInput).toHaveBeenCalledTimes(2);
    });

    test('should return expected values from transportCreated prompt methods', async () => {
        mockDefaultOrShowTransportCreatedQuestion.mockReturnValueOnce(true);

        PromptState.transportAnswers.newTransportNumber = 'TR1234';

        const transportPrompts = getTransportRequestPrompts({});
        const transportCreatedPrompt = transportPrompts.find((prompt) => prompt.name === promptNames.transportCreated);

        if (transportCreatedPrompt) {
            expect(
                (transportCreatedPrompt.when as Function)({ transportInputChoice: TransportChoices.CreateNewChoice })
            ).toBe(true);
            expect(transportCreatedPrompt.message).toBe(t('prompts.config.transport.transportCreated.message'));
            expect((transportCreatedPrompt.default as Function)()).toBe('TR1234');
        }
    });

    test('should return expected values from transportFromList prompt methods', async () => {
        mockDefaultOrShowTransportListQuestion.mockReturnValueOnce(true);

        PromptState.transportAnswers.transportList = [
            { transportReqNumber: 'TR1234', transportReqDescription: 'Transport 1' },
            { transportReqNumber: 'TR1235', transportReqDescription: 'Transport 2' }
        ];

        const transportPrompts = getTransportRequestPrompts({});
        const transportFromListPrompt = transportPrompts.find(
            (prompt) => prompt.name === promptNames.transportFromList
        );

        if (transportFromListPrompt) {
            expect(
                (transportFromListPrompt.when as Function)({
                    transportInputChoice: TransportChoices.ListExistingChoice
                })
            ).toBe(true);
            expect(transportFromListPrompt.message).toBe(t('prompts.config.transport.common.transportRequest'));
            expect(((transportFromListPrompt as ListQuestion).choices as Function)()).toMatchInlineSnapshot(`
                Array [
                  Object {
                    "name": "TR1234 (Transport 1)",
                    "value": "TR1234",
                  },
                  Object {
                    "name": "TR1235 (Transport 2)",
                    "value": "TR1235",
                  },
                ]
            `);
            expect((transportFromListPrompt.default as Function)()).toBe(undefined);
        }
    });

    test('should return expected values from transportManual prompt methods', async () => {
        mockDefaultOrShowManualTransportQuestion.mockReturnValueOnce(true);
        mockValidateTransportQuestion.mockReturnValueOnce(true);

        const transportPrompts = getTransportRequestPrompts({});
        const transportManualPrompt = transportPrompts.find((prompt) => prompt.name === promptNames.transportManual);

        if (transportManualPrompt) {
            expect(
                (transportManualPrompt.when as Function)({
                    transportInputChoice: TransportChoices.EnterManualChoice
                })
            ).toBe(true);
            expect(transportManualPrompt.message).toBe(t('prompts.config.transport.common.transportRequest'));
            const previousAnswers = { transportManual: 'TR1234' };
            expect((transportManualPrompt.default as Function)(previousAnswers)).toBe('TR1234');
            expect((transportManualPrompt.validate as Function)(previousAnswers)).toBe(true);
            expect((transportManualPrompt.filter as Function)('trn12 ')).toBe('TRN12');
        }
    });
});

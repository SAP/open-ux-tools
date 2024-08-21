import { initI18n, t } from '../../../../src/i18n';
import { getTransportRequestPrompts } from '../../../../src/prompts/questions';
import * as conditions from '../../../../src/prompts/conditions';
import * as validators from '../../../../src/prompts/validators';
import { abapDeployConfigInternalPromptNames, TransportChoices } from '../../../../src/types';
import { ListQuestion } from '@sap-ux/inquirer-common';
import { PromptState } from '../../../../src/prompts/prompt-state';

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
                "message": "How do you want to enter the transport request?",
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
                "message": "Created new Transport Request",
                "name": "transportCreated",
                "type": "input",
                "when": [Function],
              },
              Object {
                "choices": [Function],
                "default": [Function],
                "guiOptions": Object {
                  "breadcrumb": "Transport Request",
                  "hint": "Provide a transport request for your application",
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
                  "hint": "Provide a transport request for your application",
                },
                "message": [Function],
                "name": "transportManual",
                "type": "input",
                "validate": [Function],
                "when": [Function],
              },
            ]
        `);
    });

    test('should return expected values from transportInputChoice prompt methods', async () => {
        jest.spyOn(conditions, 'showTransportInputChoice').mockReturnValueOnce(true);
        jest.spyOn(validators, 'validateTransportChoiceInput').mockResolvedValueOnce(true);

        const transportPrompts = getTransportRequestPrompts({});
        const transportInputChoicePrompt = transportPrompts.find(
            (prompt) => prompt.name === abapDeployConfigInternalPromptNames.transportInputChoice
        );

        if (transportInputChoicePrompt) {
            expect((transportInputChoicePrompt.when as Function)()).toBe(true);
            expect(transportInputChoicePrompt.message).toBe(t('prompts.config.transport.transportInputChoice.message'));
            expect(((transportInputChoicePrompt as ListQuestion).choices as Function)()).toMatchInlineSnapshot(`
                Array [
                  Object {
                    "name": "Enter manually",
                    "value": "EnterManualChoice",
                  },
                  Object {
                    "name": "Choose from existing",
                    "value": "ListExistingChoice",
                  },
                  Object {
                    "name": "Create during deployment",
                    "value": "CreateDuringDeployChoice",
                  },
                  Object {
                    "name": "Create new",
                    "value": "CreateNewChoice",
                  },
                ]
            `);

            expect((transportInputChoicePrompt.default as Function)({})).toBe(TransportChoices.EnterManualChoice);
            expect(await (transportInputChoicePrompt.validate as Function)()).toBe(true);
        }
    });

    test('should return expected values from transportCliExecution prompt methods', async () => {
        const validateTransportChoiceInputSpy = jest.spyOn(validators, 'validateTransportChoiceInput');

        PromptState.isYUI = false;
        const transportPrompts = getTransportRequestPrompts({});
        const transportCliExecutionPrompt = transportPrompts.find(
            (prompt) => prompt.name === abapDeployConfigInternalPromptNames.transportCliExecution
        );

        if (transportCliExecutionPrompt) {
            validateTransportChoiceInputSpy.mockResolvedValueOnce(true);
            expect(await (transportCliExecutionPrompt.when as Function)({})).toBe(false);

            validateTransportChoiceInputSpy.mockResolvedValueOnce('Error with transports');

            try {
                await (transportCliExecutionPrompt.when as Function)({});
                fail('Expected error');
            } catch (e) {
                expect(e.message).toBe('Error with transports');
            }
        }
        expect(validateTransportChoiceInputSpy).toHaveBeenCalledTimes(2);
    });

    test('should return expected values from transportCreated prompt methods', async () => {
        jest.spyOn(conditions, 'defaultOrShowTransportCreatedQuestion').mockReturnValueOnce(true);

        PromptState.transportAnswers.newTransportNumber = 'TR1234';

        const transportPrompts = getTransportRequestPrompts({});
        const transportCreatedPrompt = transportPrompts.find(
            (prompt) => prompt.name === abapDeployConfigInternalPromptNames.transportCreated
        );

        if (transportCreatedPrompt) {
            expect(
                (transportCreatedPrompt.when as Function)({ transportInputChoice: TransportChoices.CreateNewChoice })
            ).toBe(true);
            expect(transportCreatedPrompt.message).toBe(t('prompts.config.transport.transportCreated.message'));
            expect((transportCreatedPrompt.default as Function)()).toBe('TR1234');
        }
    });

    test('should return expected values from transportFromList prompt methods', async () => {
        jest.spyOn(conditions, 'defaultOrShowTransportListQuestion').mockReturnValueOnce(true);

        PromptState.transportAnswers.transportList = [
            { transportReqNumber: 'TR1234', transportReqDescription: 'Transport 1' },
            { transportReqNumber: 'TR1235', transportReqDescription: 'Transport 2' }
        ];

        const transportPrompts = getTransportRequestPrompts({});
        const transportFromListPrompt = transportPrompts.find(
            (prompt) => prompt.name === abapDeployConfigInternalPromptNames.transportFromList
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
        jest.spyOn(conditions, 'defaultOrShowManualTransportQuestion').mockReturnValueOnce(true);
        jest.spyOn(validators, 'validateTransportQuestion').mockReturnValueOnce(true);

        const transportPrompts = getTransportRequestPrompts({});
        const transportManualPrompt = transportPrompts.find(
            (prompt) => prompt.name === abapDeployConfigInternalPromptNames.transportManual
        );

        if (transportManualPrompt) {
            expect(
                (transportManualPrompt.when as Function)({
                    transportInputChoice: TransportChoices.EnterManualChoice
                })
            ).toBe(true);
            expect((transportManualPrompt.message as Function)()).toBe(
                t('prompts.config.transport.common.transportRequestMandatory')
            );
            const previousAnswers = { transportManual: 'TR1234' };
            expect((transportManualPrompt.default as Function)(previousAnswers)).toBe('TR1234');
            expect((transportManualPrompt.validate as Function)(previousAnswers)).toBe(true);
            expect((transportManualPrompt.filter as Function)('trn12 ')).toBe('TRN12');
        }
    });
});

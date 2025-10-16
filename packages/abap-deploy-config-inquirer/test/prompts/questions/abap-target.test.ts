import { isAppStudio, isOnPremiseDestination } from '@sap-ux/btp-utils';
import type { AbapDeployConfigPromptOptions } from '../../../src/types';
import { promptNames, ClientChoiceValue, TargetSystemType } from '../../../src/types';
import { getAbapTargetPrompts } from '../../../src/prompts/questions';
import { getAbapSystems } from '../../../src/utils';
import { mockDestinations } from '../../fixtures/destinations';
import { mockTargetSystems } from '../../fixtures/targets';
import type { ListQuestion } from '@sap-ux/inquirer-common';
import * as validators from '../../../src/prompts/validators';
import * as conditions from '../../../src/prompts/conditions';
import { initI18n, t } from '../../../src/i18n';
import { Severity } from '@sap-devx/yeoman-ui-types';
import type { UrlAbapTarget } from '@sap-ux/system-access';
import { PromptState } from '../../../src/prompts/prompt-state';

jest.mock('@sap-ux/btp-utils', () => ({
    ...jest.requireActual('@sap-ux/btp-utils'),
    isOnPremiseDestination: jest.fn(),
    isAppStudio: jest.fn()
}));

jest.mock('../../../src/utils', () => ({
    ...jest.requireActual('../../../src/utils'),
    getAbapSystems: jest.fn()
}));

const mockIsOnPremiseDestination = isOnPremiseDestination as jest.Mock;
const mockIsAppStudio = isAppStudio as jest.Mock;
const mockGetAbapSystems = getAbapSystems as jest.Mock;

describe('getAbapTargetPrompts', () => {
    beforeAll(async () => {
        await initI18n();
    });
    it('should return expected prompts', async () => {
        mockIsAppStudio.mockReturnValue(false);
        mockGetAbapSystems.mockResolvedValueOnce({
            destinations: undefined,
            backendSystems: undefined
        });
        PromptState.isYUI = true;
        const prompts = await getAbapTargetPrompts({});
        expect(prompts).toMatchInlineSnapshot(`
            Array [
              Object {
                "additionalMessages": [Function],
                "choices": [Function],
                "default": [Function],
                "filter": [Function],
                "guiOptions": Object {
                  "breadcrumb": true,
                  "mandatory": true,
                },
                "message": "Destination",
                "name": "destination",
                "type": "list",
                "validate": [Function],
                "when": [Function],
              },
              Object {
                "choices": [Function],
                "default": [Function],
                "guiOptions": Object {
                  "breadcrumb": "Target System",
                  "mandatory": true,
                },
                "message": "Select Target System",
                "name": "targetSystem",
                "type": "list",
                "validate": [Function],
                "when": [Function],
              },
              Object {
                "default": [Function],
                "filter": [Function],
                "guiOptions": Object {
                  "breadcrumb": true,
                  "mandatory": true,
                },
                "message": "Target System URL",
                "name": "url",
                "type": "input",
                "validate": [Function],
                "when": [Function],
              },
              Object {
                "default": [Function],
                "guiOptions": Object {
                  "breadcrumb": "SCP",
                },
                "message": "Is This an SAP Business Technology Platform System?",
                "name": "scp",
                "type": "confirm",
                "when": [Function],
              },
              Object {
                "name": "scpSetter",
                "when": [Function],
              },
              Object {
                "choices": [Function],
                "default": [Function],
                "guiOptions": Object {
                  "applyDefaultWhenDirty": true,
                },
                "message": "Client",
                "name": "clientChoice",
                "type": "list",
                "validate": [Function],
                "when": [Function],
              },
              Object {
                "default": [Function],
                "filter": [Function],
                "guiOptions": Object {
                  "breadcrumb": "Client",
                },
                "message": "Enter Client",
                "name": "client",
                "type": "input",
                "validate": [Function],
                "when": [Function],
              },
            ]
        `);
    });

    test('should return expected values from destination prompt methods', async () => {
        mockIsAppStudio.mockReturnValue(true);
        mockGetAbapSystems.mockResolvedValueOnce({
            destinations: mockDestinations,
            backendSystems: undefined
        });
        mockIsOnPremiseDestination.mockReturnValueOnce(true);
        jest.spyOn(validators, 'validateDestinationQuestion').mockResolvedValueOnce(true);

        const abapDeployConfigPromptOptions = {
            backendTarget: {
                abapTarget: {
                    destination: 'mockDest1'
                }
            }
        } as AbapDeployConfigPromptOptions;

        const abapTargetPrompts = await getAbapTargetPrompts(abapDeployConfigPromptOptions);
        const destPrompt = abapTargetPrompts.find((prompt) => prompt.name === promptNames.destination);

        if (destPrompt) {
            expect((destPrompt.when as Function)()).toBe(true);
            expect(destPrompt.message).toBe(t('prompts.target.destination.message'));
            expect((destPrompt.default as Function)()).toEqual('mockDest1');
            expect((destPrompt.filter as Function)('mockDest1 ')).toEqual('mockDest1');
            expect(await (destPrompt.validate as Function)()).toEqual(true);
            expect(((destPrompt as ListQuestion).additionalMessages as Function)('mockDestination')).toStrictEqual({
                message: t('warnings.virtualHost'),
                severity: Severity.information
            });
            expect(((destPrompt as ListQuestion).choices as Function)()).toMatchInlineSnapshot(`
                Array [
                  Object {
                    "name": "Dest1 - https://mock.url.dest1.com",
                    "scp": false,
                    "url": "https://mock.url.dest1.com",
                    "value": "Dest1",
                  },
                  Object {
                    "name": "Dest2 - https://mock.url.dest2.com",
                    "scp": false,
                    "url": "https://mock.url.dest2.com",
                    "value": "Dest2",
                  },
                ]
            `);
        } else {
            throw new Error('Destination prompt not found');
        }
    });

    test('should return expected values from destination prompt methods on CLI', async () => {
        PromptState.isYUI = false;
        mockIsAppStudio.mockReturnValue(true);
        mockGetAbapSystems.mockResolvedValueOnce({
            destinations: mockDestinations,
            backendSystems: undefined
        });
        const updateDestinationPromptStateSpy = jest.spyOn(validators, 'updateDestinationPromptState');
        const abapTargetPrompts = await getAbapTargetPrompts({});
        const destinationCliSetterPrompt = abapTargetPrompts.find(
            (prompt) => prompt.name === promptNames.destinationCliSetter
        );
        if (destinationCliSetterPrompt) {
            expect(
                await (destinationCliSetterPrompt.when as Function)({
                    destination: 'mockDest1'
                })
            ).toBe(false);
            expect(updateDestinationPromptStateSpy).toHaveBeenCalledWith(
                'mockDest1',
                mockDestinations,
                undefined,
                undefined
            );
        } else {
            throw new Error('Destination setter prompt not found');
        }
    });

    test('should return expected values from target system prompt methods', async () => {
        mockIsAppStudio.mockReturnValue(false);
        mockGetAbapSystems.mockResolvedValueOnce({
            destinations: undefined,
            backendSystems: mockTargetSystems
        });
        jest.spyOn(validators, 'validateTargetSystem').mockResolvedValueOnce(true);

        const abapTargetPrompts = await getAbapTargetPrompts({});
        const targetSystemPrompt = abapTargetPrompts.find((prompt) => prompt.name === promptNames.targetSystem);

        if (targetSystemPrompt) {
            expect((targetSystemPrompt.when as Function)()).toBe(true);
            expect(targetSystemPrompt.message).toBe(t('prompts.target.targetSystem.message'));
            expect((targetSystemPrompt.default as Function)()).toEqual(undefined);
            expect(await (targetSystemPrompt.validate as Function)()).toEqual(true);
            expect(((targetSystemPrompt as ListQuestion).choices as Function)()).toMatchInlineSnapshot(`
                Array [
                  Object {
                    "name": "Enter Target System URL",
                    "value": "Url",
                  },
                  Object {
                    "client": "100",
                    "isAbapCloud": false,
                    "isDefault": false,
                    "name": "target1 [mockUser]",
                    "scp": false,
                    "value": "https://mock.url.target1.com",
                  },
                  Object {
                    "client": "102",
                    "isAbapCloud": true,
                    "isDefault": false,
                    "name": "target2 (ABAP Cloud) [mockUser2]",
                    "scp": false,
                    "value": "https://mock.url.target2.com",
                  },
                  Object {
                    "client": "103",
                    "isAbapCloud": false,
                    "isDefault": false,
                    "name": "target3 [mockUser3]",
                    "scp": false,
                    "value": "https://mock.url.target3.com",
                  },
                  Object {
                    "client": "104",
                    "isAbapCloud": false,
                    "isDefault": false,
                    "name": "target4 [mockUser4]",
                    "scp": false,
                    "value": "https://mock.url.target4.com",
                  },
                ]
            `);
        } else {
            throw new Error('Target system prompt not found');
        }
    });

    test('should return expected values from target prompt methods on CLI', async () => {
        PromptState.isYUI = false;
        mockIsAppStudio.mockReturnValue(false);
        mockGetAbapSystems.mockResolvedValueOnce({
            destinations: undefined,
            backendSystems: mockTargetSystems
        });
        const validateTargetSystemUrlCliSpy = jest.spyOn(validators, 'validateTargetSystemUrlCli');
        const abapTargetPrompts = await getAbapTargetPrompts({});
        const targetSystemCliSetterPrompt = abapTargetPrompts.find(
            (prompt) => prompt.name === promptNames.targetSystemCliSetter
        );

        if (targetSystemCliSetterPrompt) {
            expect(
                (targetSystemCliSetterPrompt.when as Function)({
                    targetSystem: 'target1'
                })
            ).toBe(false);
            expect(validateTargetSystemUrlCliSpy).toHaveBeenCalledTimes(1);
        } else {
            throw new Error('Target system setter prompt not found');
        }
    });

    test('should return expected values from url prompt methods', async () => {
        mockGetAbapSystems.mockResolvedValueOnce({
            destinations: undefined,
            backendSystems: undefined
        });
        PromptState.isYUI = true;
        jest.spyOn(validators, 'validateTargetSystemUrlCli').mockReturnValueOnce();
        jest.spyOn(validators, 'validateUrl').mockReturnValueOnce(true);
        const abapTargetPrompts = await getAbapTargetPrompts({});
        const urlPrompt = abapTargetPrompts.find((prompt) => prompt.name === promptNames.url);

        if (urlPrompt) {
            expect((urlPrompt.when as Function)({ targetSystem: TargetSystemType.Url })).toBe(true);
            expect(urlPrompt.message).toBe(t('prompts.target.url.message'));
            expect((urlPrompt.default as Function)({ targetSystem: TargetSystemType.Url })).toEqual('');
            expect((urlPrompt.filter as Function)('target system 1 ')).toEqual('target system 1');
            expect(await (urlPrompt.validate as Function)()).toEqual(true);
        } else {
            throw new Error('Url prompt not found');
        }
    });

    test('should return expected values from scp prompt methods', async () => {
        mockGetAbapSystems.mockResolvedValueOnce({
            destinations: undefined,
            backendSystems: undefined
        });
        jest.spyOn(conditions, 'showScpQuestion').mockReturnValueOnce(true);
        const abapTargetPrompts = await getAbapTargetPrompts({
            backendTarget: { abapTarget: { scp: true } as UrlAbapTarget }
        });
        const scpPrompt = abapTargetPrompts.find((prompt) => prompt.name === promptNames.scp);
        const scpSetterPrompt = abapTargetPrompts.find((prompt) => prompt.name === promptNames.scpSetter);
        if (scpPrompt) {
            expect(
                (scpPrompt.when as Function)({
                    targetSystem: TargetSystemType.Url,
                    url: 'https://mock.target1.url.com'
                })
            ).toBe(true);
            expect(scpPrompt.message).toBe(t('prompts.target.scp.message'));
            expect((scpPrompt.default as Function)()).toEqual(true);
            expect(PromptState.abapDeployConfig.scp).toBeUndefined();
        } else {
            throw new Error('Scp prompt not found');
        }

        if (scpSetterPrompt) {
            PromptState.resetAbapDeployConfig();
            expect(PromptState.abapDeployConfig.scp).toBeUndefined();
            expect(
                (scpSetterPrompt.when as Function)({
                    targetSystem: TargetSystemType.Url,
                    url: 'https://mock.target1.url.com',
                    scp: true
                })
            ).toBe(false);
            expect(PromptState.abapDeployConfig.scp).toBe(true);
            // Toggle the scp question
            expect(
                (scpSetterPrompt.when as Function)({
                    targetSystem: TargetSystemType.Url,
                    url: 'https://mock.target1.url.com',
                    scp: false
                })
            ).toBe(false);
            expect(PromptState.abapDeployConfig.scp).toBe(false);
            // SCP not answered
            PromptState.abapDeployConfig.scp = true; // Should be reset after setter is run
            expect(
                (scpSetterPrompt.when as Function)({
                    targetSystem: TargetSystemType.Url,
                    url: 'https://mock.target1.url.com'
                })
            ).toBe(false);
            expect(PromptState.abapDeployConfig.scp).toBe(false);
            // Maintain state if user is selecting a different targetSystem
            PromptState.abapDeployConfig.scp = true;
            expect(
                (scpSetterPrompt.when as Function)({
                    targetSystem: 'Something',
                    url: 'https://mock.target1.url.com'
                })
            ).toBe(false);
            expect(PromptState.abapDeployConfig.scp).toBe(true);
        } else {
            throw new Error('Scp setter prompt not found');
        }
        PromptState.resetAbapDeployConfig();
    });

    test('should return expected values from client choice prompt methods', async () => {
        mockGetAbapSystems.mockResolvedValueOnce({
            destinations: undefined,
            backendSystems: undefined
        });
        jest.spyOn(conditions, 'showClientChoiceQuestion').mockReturnValueOnce(true);
        jest.spyOn(validators, 'validateClientChoiceQuestion').mockReturnValueOnce(true);
        const abapTargetPrompts = await getAbapTargetPrompts({});
        const clientChoicePrompt = abapTargetPrompts.find((prompt) => prompt.name === promptNames.clientChoice);

        if (clientChoicePrompt) {
            expect((clientChoicePrompt.when as Function)()).toBe(true);
            expect(clientChoicePrompt.message).toBe(t('prompts.target.clientChoice.message'));
            expect((clientChoicePrompt.default as Function)()).toEqual(ClientChoiceValue.Blank);
            expect((clientChoicePrompt.validate as Function)()).toEqual(true);
            expect(((clientChoicePrompt as ListQuestion).choices as Function)()).toMatchInlineSnapshot(`
                Array [
                  Object {
                    "name": "Use Project Defined Client: ",
                    "value": "base",
                  },
                  Object {
                    "name": "Enter Client",
                    "value": "new",
                  },
                  Object {
                    "name": "Use Default System Client",
                    "value": "blank",
                  },
                ]
            `);
        } else {
            throw new Error('Client choice prompt not found');
        }
    });

    test('should return expected values from client prompt methods', async () => {
        mockGetAbapSystems.mockResolvedValueOnce({
            destinations: undefined,
            backendSystems: undefined
        });
        jest.spyOn(conditions, 'showClientQuestion').mockReturnValueOnce(true);
        jest.spyOn(validators, 'validateClientChoiceQuestion').mockReturnValueOnce(true);
        const abapTargetPrompts = await getAbapTargetPrompts({
            backendTarget: { abapTarget: { client: '100' } as UrlAbapTarget }
        });
        const clientPrompt = abapTargetPrompts.find((prompt) => prompt.name === promptNames.client);

        if (clientPrompt) {
            PromptState.abapDeployConfig.client = '100';
            expect((clientPrompt.when as Function)({})).toBe(true);
            expect(clientPrompt.message).toBe(t('prompts.target.client.message'));
            expect((clientPrompt.default as Function)()).toEqual('100');
            expect((clientPrompt.filter as Function)('100 ')).toEqual('100');

            expect((clientPrompt.validate as Function)()).toEqual(true);
        } else {
            throw new Error('Client choice prompt not found');
        }
        PromptState.resetAbapDeployConfig();
    });
});

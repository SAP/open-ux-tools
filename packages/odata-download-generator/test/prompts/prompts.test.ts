import { Severity } from '@sap-devx/yeoman-ui-types';
import { getHostEnvironment, hostEnvironment } from '@sap-ux/fiori-generator-shared';
import type { CheckBoxQuestion, ConfirmQuestion, InputQuestion } from '@sap-ux/inquirer-common';
import { getSystemSelectionQuestions, OdataVersion } from '@sap-ux/odata-service-inquirer';
import { createApplicationAccess } from '@sap-ux/project-access';
import type { Answers } from 'inquirer';
import {
    getODataDownloaderPrompts,
    promptNames,
    type SelectedEntityAnswer
} from '../../src/data-download/prompts/prompts';
import * as promptHelpers from '../../src/data-download/prompts/prompt-helpers';
import { getEntityModel } from '../../src/data-download/utils';
import { PromptState } from '../../src/data-download/prompt-state';

jest.mock('@sap-ux/fiori-generator-shared');
jest.mock('@sap-ux/odata-service-inquirer');
jest.mock('@sap-ux/project-access');
jest.mock('../../src/data-download/prompts/prompt-helpers');
jest.mock('../../src/data-download/utils');

describe('Test prompts', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset PromptState caches for test isolation
        PromptState.externalServiceRequestCache = {};
        PromptState.entityTypeRefFacetCache = {};
    });

    describe('getODataDownloaderPrompts', () => {
        it('should return questions and answers structure', async () => {
            // Mock dependencies
            (getHostEnvironment as jest.Mock).mockReturnValue(hostEnvironment.cli);
            (getSystemSelectionQuestions as jest.Mock).mockResolvedValue({
                prompts: [],
                answers: {}
            });

            const result = await getODataDownloaderPrompts();

            expect(result).toHaveProperty('questions');
            expect(result).toHaveProperty('answers');
            expect(result.answers).toHaveProperty('application');
            expect(result.answers).toHaveProperty('odataQueryResult');
            expect(result.answers).toHaveProperty('odataServiceAnswers');
            expect(Array.isArray(result.questions)).toBe(true);
        });

        it('should include all required prompts', async () => {
            (getHostEnvironment as jest.Mock).mockReturnValue(hostEnvironment.cli);
            (getSystemSelectionQuestions as jest.Mock).mockResolvedValue({
                prompts: [
                    { name: 'datasourceType', type: 'list' },
                    { name: 'serviceSelection', type: 'list' }
                ],
                answers: {}
            });

            const result = await getODataDownloaderPrompts();

            expect(result.questions.length).toBeGreaterThan(0);
            // Should include app selection, system selection, key prompts, reset, entity selection, and confirm download
            const allPromptNames = result.questions.map((q: any) => q.name);
            expect(allPromptNames).toContain(promptNames.appSelection);
            expect(allPromptNames).toContain('datasourceType');
            expect(allPromptNames).toContain('serviceSelection');
            expect(allPromptNames).toContain(promptNames.toggleSelection);
            expect(allPromptNames).toContain(promptNames.relatedEntitySelection);
            expect(allPromptNames).toContain(promptNames.confirmDownload);
            // Verify key prompts exist
            const keyPrompts = result.questions.filter((q: any) => q.name?.startsWith('entityKeyIdx:'));
            expect(keyPrompts.length).toBe(5);
        });

        it('should pass correct options to getSystemSelectionQuestions', async () => {
            (getHostEnvironment as jest.Mock).mockReturnValue(hostEnvironment.vscode);
            (getSystemSelectionQuestions as jest.Mock).mockResolvedValue({
                prompts: [],
                answers: {}
            });

            await getODataDownloaderPrompts();

            expect(getSystemSelectionQuestions).toHaveBeenCalledWith(
                expect.objectContaining({
                    datasourceType: {
                        includeNone: false
                    },
                    systemSelection: expect.objectContaining({
                        includeCloudFoundryAbapEnvChoice: false,
                        hideNewSystem: true
                    }),
                    serviceSelection: expect.objectContaining({
                        requiredOdataVersion: OdataVersion.v4
                    })
                }),
                true,
                expect.anything()
            );
        });

        it('should generate 5 key prompts', async () => {
            (getHostEnvironment as jest.Mock).mockReturnValue(hostEnvironment.cli);
            (getSystemSelectionQuestions as jest.Mock).mockResolvedValue({
                prompts: [],
                answers: {}
            });

            const result = await getODataDownloaderPrompts();

            // Count key prompts
            const keyPrompts = result.questions.filter((q: any) => q.name?.startsWith('entityKeyIdx:'));
            expect(keyPrompts.length).toBe(5);
        });
    });

    describe('App Selection Prompt', () => {
        let appSelectionPrompt: InputQuestion;

        beforeEach(async () => {
            (getHostEnvironment as jest.Mock).mockReturnValue(hostEnvironment.cli);
            (getSystemSelectionQuestions as jest.Mock).mockResolvedValue({
                prompts: [],
                answers: {}
            });

            const result = await getODataDownloaderPrompts();
            appSelectionPrompt = result.questions.find(
                (q: any) => q.name === promptNames.appSelection
            ) as InputQuestion;
        });

        it('should have correct configuration', () => {
            expect(appSelectionPrompt).toBeDefined();
            expect(appSelectionPrompt.type).toBe('input');
            expect((appSelectionPrompt as any).guiType).toBe('folder-browser');
            expect(appSelectionPrompt.name).toBe(promptNames.appSelection);
        });

        it('should validate app path successfully', async () => {
            const mockAppAccess = {
                app: {
                    appRoot: '/test/app',
                    services: { mainService: { uri: '/service' } },
                    mainService: 'mainService'
                }
            };
            const mockSpec = { getApiVersion: () => ({ version: '24' }) };

            (createApplicationAccess as jest.Mock).mockResolvedValue(mockAppAccess);
            (promptHelpers.getSpecification as jest.Mock).mockResolvedValue(mockSpec);
            (promptHelpers.getServiceDetails as jest.Mock).mockResolvedValue({
                servicePath: '/service/path',
                systemName: 'TestSystem'
            });

            const result = await appSelectionPrompt.validate!('/test/app');

            expect(result).toBe(true);
            expect(createApplicationAccess).toHaveBeenCalledWith('/test/app');
        });

        it('should configure appConfig correctly after successful validation', async () => {
            const mockAppAccess = {
                app: {
                    appRoot: '/test/app',
                    services: { mainService: { uri: '/service' } },
                    mainService: 'mainService'
                }
            };
            const mockSpec = {
                getApiVersion: () => ({ version: '24' }),
                serviceInfo: { name: 'TestService' }
            };

            (createApplicationAccess as jest.Mock).mockResolvedValue(mockAppAccess);
            (promptHelpers.getSpecification as jest.Mock).mockResolvedValue(mockSpec);
            (promptHelpers.getServiceDetails as jest.Mock).mockResolvedValue({
                servicePath: '/sap/opu/odata4/service/path',
                systemName: 'BACKEND_SYSTEM'
            });

            // Get the prompts to access the appConfig
            const result = await getODataDownloaderPrompts();
            const appConfig = result.answers.application;
            const prompt = result.questions.find((q: any) => q.name === promptNames.appSelection) as InputQuestion;

            // Validate the app path
            const validationResult = await prompt.validate!('/test/app');

            expect(validationResult).toBe(true);

            // Verify appConfig.appAccess is set correctly
            expect(appConfig.appAccess).toBeDefined();
            expect(appConfig.appAccess?.app.appRoot).toBe('/test/app');
            expect(appConfig.appAccess?.app.services.mainService.uri).toBe('/service');
            expect(appConfig.appAccess?.app.mainService).toBe('mainService');

            // Verify appConfig.specification is set correctly
            expect(appConfig.specification).toBeDefined();
            expect(appConfig.specification?.getApiVersion()).toEqual({ version: '24' });
            expect((appConfig.specification as any)?.serviceInfo?.name).toBe('TestService');

            // Verify appConfig.servicePath is set correctly
            expect(appConfig.servicePath).toBe('/sap/opu/odata4/service/path');

            // Verify appConfig.systemName is set correctly
            expect(appConfig.systemName).toBeDefined();
            expect(appConfig.systemName?.value).toBe('BACKEND_SYSTEM');

            // Verify helper functions were called with correct parameters
            expect(createApplicationAccess).toHaveBeenCalledWith('/test/app');
            expect(promptHelpers.getSpecification).toHaveBeenCalledWith(mockAppAccess);
            expect(promptHelpers.getServiceDetails).toHaveBeenCalledWith(
                '/test/app',
                mockAppAccess.app.services.mainService
            );
        });

        it('should return false for empty app path', async () => {
            const result = await appSelectionPrompt.validate!('');

            expect(result).toBe(false);
        });

        it('should return error message when specification check fails', async () => {
            const mockAppAccess = {
                app: {
                    appRoot: '/test/app',
                    services: { mainService: {} }
                }
            };

            (createApplicationAccess as jest.Mock).mockResolvedValue(mockAppAccess);
            (promptHelpers.getSpecification as jest.Mock).mockResolvedValue('Error: Invalid specification');

            const result = await appSelectionPrompt.validate!('/test/app');

            expect(result).toBe('Error: Invalid specification');
        });

        it('should reset appConfig when a different app is selected', async () => {
            // First, set up initial app
            const mockAppAccess1 = {
                app: {
                    appRoot: '/test/app1',
                    services: { mainService: { uri: '/service1' } },
                    mainService: 'mainService'
                }
            };
            const mockSpec1 = { getApiVersion: () => ({ version: '24' }) };

            (createApplicationAccess as jest.Mock).mockResolvedValue(mockAppAccess1);
            (promptHelpers.getSpecification as jest.Mock).mockResolvedValue(mockSpec1);
            (promptHelpers.getServiceDetails as jest.Mock).mockResolvedValue({
                servicePath: '/service1/path',
                systemName: 'System1'
            });

            // Get prompts and access the underlying appConfig through answers
            const result = await getODataDownloaderPrompts();
            const appConfig = result.answers.application;
            const firstAppPrompt = result.questions.find(
                (q: any) => q.name === promptNames.appSelection
            ) as InputQuestion;

            // Validate first app
            await firstAppPrompt.validate!('/test/app1');

            // Store the initial appConfig values
            const initialAppAccess = appConfig.appAccess;
            const initialServicePath = appConfig.servicePath;
            const initialSystemName = appConfig.systemName?.value;

            expect(initialAppAccess).toBeDefined();
            expect(initialServicePath).toBe('/service1/path');
            expect(initialSystemName).toBe('System1');

            // Now select a different app
            const mockAppAccess2 = {
                app: {
                    appRoot: '/test/app2',
                    services: { mainService: { uri: '/service2' } },
                    mainService: 'mainService'
                }
            };
            const mockSpec2 = { getApiVersion: () => ({ version: '24' }) };

            (createApplicationAccess as jest.Mock).mockResolvedValue(mockAppAccess2);
            (promptHelpers.getSpecification as jest.Mock).mockResolvedValue(mockSpec2);
            (promptHelpers.getServiceDetails as jest.Mock).mockResolvedValue({
                servicePath: '/service2/path',
                systemName: 'System2'
            });

            await firstAppPrompt.validate!('/test/app2');

            // Verify that appConfig was reset and updated with new values
            expect(appConfig.appAccess).toBeDefined();
            expect(appConfig.appAccess?.app.appRoot).toBe('/test/app2');
            expect(appConfig.servicePath).toBe('/service2/path');
            expect(appConfig.systemName?.value).toBe('System2');

            // Verify the old values were replaced (not the same references)
            expect(appConfig.appAccess).not.toBe(initialAppAccess);
        });

        it('should return true when validating the same app path without resetting', async () => {
            const mockAppAccess = {
                app: {
                    appRoot: '/test/app',
                    services: { mainService: { uri: '/service' } },
                    mainService: 'mainService'
                }
            };
            const mockSpec = { getApiVersion: () => ({ version: '24' }) };

            (createApplicationAccess as jest.Mock).mockResolvedValue(mockAppAccess);
            (promptHelpers.getSpecification as jest.Mock).mockResolvedValue(mockSpec);
            (promptHelpers.getServiceDetails as jest.Mock).mockResolvedValue({
                servicePath: '/service/path',
                systemName: 'TestSystem'
            });

            // Get prompts and set up appConfig
            const result = await getODataDownloaderPrompts();
            const appConfig = result.answers.application;
            const firstAppPrompt = result.questions.find(
                (q: any) => q.name === promptNames.appSelection
            ) as InputQuestion;

            // First validation
            await firstAppPrompt.validate!('/test/app');
            appConfig.referencedEntities = {
                listEntity: {
                    entitySetName: 'TestSet',
                    semanticKeys: [],
                    entityPath: 'TestSet',
                    entityType: undefined
                }
            };

            // Validate same path again
            const secondResult = await firstAppPrompt.validate!('/test/app');

            // Should return true without resetting appConfig
            expect(secondResult).toBe(true);
            expect(appConfig.referencedEntities).toBeDefined();
            expect(appConfig.referencedEntities?.listEntity.entitySetName).toBe('TestSet');

            // createApplicationAccess should only be called once (from first validation)
            expect(createApplicationAccess).toHaveBeenCalledTimes(1);
        });

        it('should reset PromptState caches when app selection changes', async () => {
            const mockAppAccess1 = {
                app: {
                    appRoot: '/test/app1',
                    services: { mainService: { uri: '/service1' } },
                    mainService: 'mainService'
                }
            };
            const mockSpec1 = { getApiVersion: () => ({ version: '24' }) };

            (createApplicationAccess as jest.Mock).mockResolvedValue(mockAppAccess1);
            (promptHelpers.getSpecification as jest.Mock).mockResolvedValue(mockSpec1);
            (promptHelpers.getServiceDetails as jest.Mock).mockResolvedValue({
                servicePath: '/service1/path',
                systemName: 'System1'
            });

            // Get prompts
            const result = await getODataDownloaderPrompts();
            const firstAppPrompt = result.questions.find(
                (q: any) => q.name === promptNames.appSelection
            ) as InputQuestion;

            // Populate the PromptState caches to simulate usage
            PromptState.externalServiceRequestCache['/service/test'] = ['Entity1', 'Entity2'];
            PromptState.entityTypeRefFacetCache['TravelType'] = ['_Booking'];

            // Spy on resetServiceCaches to verify it's called
            const resetCachesSpy = jest.spyOn(PromptState, 'resetServiceCaches');

            // Validate first app - this triggers resetAppConfig which should reset caches
            await firstAppPrompt.validate!('/test/app1');

            // Verify caches were reset
            expect(resetCachesSpy).toHaveBeenCalled();
            expect(PromptState.externalServiceRequestCache).toEqual({});
            expect(PromptState.entityTypeRefFacetCache).toEqual({});

            resetCachesSpy.mockRestore();
        });

        it('should reset PromptState caches when switching between different apps', async () => {
            // First app setup
            const mockAppAccess1 = {
                app: {
                    appRoot: '/test/app1',
                    services: { mainService: { uri: '/service1' } },
                    mainService: 'mainService'
                }
            };

            (createApplicationAccess as jest.Mock).mockResolvedValue(mockAppAccess1);
            (promptHelpers.getSpecification as jest.Mock).mockResolvedValue({
                getApiVersion: () => ({ version: '24' })
            });
            (promptHelpers.getServiceDetails as jest.Mock).mockResolvedValue({
                servicePath: '/service1/path',
                systemName: 'System1'
            });

            const result = await getODataDownloaderPrompts();
            const appPrompt = result.questions.find((q: any) => q.name === promptNames.appSelection) as InputQuestion;

            // Validate first app
            await appPrompt.validate!('/test/app1');

            // Simulate cache population during first app's usage
            PromptState.externalServiceRequestCache['/service1/path'] = ['Travel', 'Booking'];
            PromptState.entityTypeRefFacetCache['TravelType'] = ['_Booking', '_Agency'];

            // Verify caches are populated
            expect(Object.keys(PromptState.externalServiceRequestCache).length).toBeGreaterThan(0);
            expect(Object.keys(PromptState.entityTypeRefFacetCache).length).toBeGreaterThan(0);

            // Switch to second app
            const mockAppAccess2 = {
                app: {
                    appRoot: '/test/app2',
                    services: { mainService: { uri: '/service2' } },
                    mainService: 'mainService'
                }
            };

            (createApplicationAccess as jest.Mock).mockResolvedValue(mockAppAccess2);
            (promptHelpers.getServiceDetails as jest.Mock).mockResolvedValue({
                servicePath: '/service2/path',
                systemName: 'System2'
            });

            // Validate second app - should reset caches
            await appPrompt.validate!('/test/app2');

            // Verify caches were reset when switching apps
            expect(PromptState.externalServiceRequestCache).toEqual({});
            expect(PromptState.entityTypeRefFacetCache).toEqual({});
        });

        it('should not reset PromptState caches when validating the same app path', async () => {
            const mockAppAccess = {
                app: {
                    appRoot: '/test/app',
                    services: { mainService: { uri: '/service' } },
                    mainService: 'mainService'
                }
            };

            (createApplicationAccess as jest.Mock).mockResolvedValue(mockAppAccess);
            (promptHelpers.getSpecification as jest.Mock).mockResolvedValue({
                getApiVersion: () => ({ version: '24' })
            });
            (promptHelpers.getServiceDetails as jest.Mock).mockResolvedValue({
                servicePath: '/service/path',
                systemName: 'TestSystem'
            });

            const result = await getODataDownloaderPrompts();
            const appPrompt = result.questions.find((q: any) => q.name === promptNames.appSelection) as InputQuestion;

            // First validation
            await appPrompt.validate!('/test/app');

            // Populate caches after first validation
            PromptState.externalServiceRequestCache['/service/path'] = ['Entity1'];
            PromptState.entityTypeRefFacetCache['Type1'] = ['path1'];

            const resetCachesSpy = jest.spyOn(PromptState, 'resetServiceCaches');

            // Validate same path again
            await appPrompt.validate!('/test/app');

            // resetServiceCaches should NOT be called when path is the same
            expect(resetCachesSpy).not.toHaveBeenCalled();

            // Caches should remain populated
            expect(PromptState.externalServiceRequestCache['/service/path']).toEqual(['Entity1']);
            expect(PromptState.entityTypeRefFacetCache['Type1']).toEqual(['path1']);

            resetCachesSpy.mockRestore();
        });
    });

    describe('Entity Selection Prompt', () => {
        let entitySelectionPrompt: CheckBoxQuestion;

        beforeEach(async () => {
            (getHostEnvironment as jest.Mock).mockReturnValue(hostEnvironment.cli);
            (getSystemSelectionQuestions as jest.Mock).mockResolvedValue({
                prompts: [],
                answers: {}
            });

            const result = await getODataDownloaderPrompts();
            entitySelectionPrompt = result.questions.find(
                (q: any) => q.name === promptNames.relatedEntitySelection
            ) as CheckBoxQuestion;
        });

        it('should have correct configuration', () => {
            expect(entitySelectionPrompt).toBeDefined();
            expect(entitySelectionPrompt.type).toBe('checkbox');
            expect(entitySelectionPrompt.name).toBe(promptNames.relatedEntitySelection);
            expect(entitySelectionPrompt.guiOptions?.applyDefaultWhenDirty).toBe(true);
        });

        it('should not show when no choices available', async () => {
            const whenFn = entitySelectionPrompt.when;
            if (typeof whenFn === 'function') {
                const shouldShow = await whenFn({});
                expect(shouldShow).toBe(false);
            } else {
                expect(whenFn).toBe(false);
            }
        });

        it('should validate and update checked state', () => {
            const mockChoices = [
                {
                    name: 'Entity1',
                    value: {
                        fullPath: 'to_Entity1',
                        entity: { entityPath: 'to_Entity1', entitySetName: 'Entity1Set' }
                    } as SelectedEntityAnswer,
                    checked: false
                }
            ];

            // Inject choices into the prompt (simulating runtime state)
            (entitySelectionPrompt.choices as any) = mockChoices;

            const selectedEntities = [mockChoices[0].value];
            const result = entitySelectionPrompt.validate!(selectedEntities);

            expect(result).toBe(true);
        });
    });

    describe('Reset Selection Prompt', () => {
        let resetPrompt: ConfirmQuestion;

        beforeEach(async () => {
            (getHostEnvironment as jest.Mock).mockReturnValue(hostEnvironment.cli);
            (getSystemSelectionQuestions as jest.Mock).mockResolvedValue({
                prompts: [],
                answers: {}
            });

            const result = await getODataDownloaderPrompts();
            resetPrompt = result.questions.find((q: any) => q.name === promptNames.toggleSelection) as ConfirmQuestion;
        });

        it('should have correct configuration', () => {
            expect(resetPrompt).toBeDefined();
            expect(resetPrompt.type).toBe('confirm');
            expect(resetPrompt.name).toBe(promptNames.toggleSelection);
            expect(resetPrompt.default).toBe(false);
        });

        it('should always return true from validate', () => {
            const result = resetPrompt.validate!(true);
            expect(result).toBe(true);

            const result2 = resetPrompt.validate!(false);
            expect(result2).toBe(true);
        });

        it('should clear all selections when reset is true (first call)', async () => {
            // Set up mock choices that createEntityChoices will return
            const mockChoices = [
                {
                    name: 'Entity1',
                    value: {
                        fullPath: 'to_Entity1',
                        entity: { entityPath: 'to_Entity1', entitySetName: 'Entity1Set', defaultSelected: true }
                    } as SelectedEntityAnswer,
                    checked: true
                },
                {
                    name: 'Entity2',
                    value: {
                        fullPath: 'to_Entity2',
                        entity: { entityPath: 'to_Entity2', entitySetName: 'Entity2Set', defaultSelected: false }
                    } as SelectedEntityAnswer,
                    checked: true
                }
            ];

            (promptHelpers.createEntityChoices as jest.Mock).mockReturnValue({
                choices: mockChoices,
                entitySetsFlat: {}
            });

            // Get fresh prompts and configure appConfig
            const result = await getODataDownloaderPrompts();
            const appConfig = result.answers.application;
            appConfig.servicePath = '/test/service';
            appConfig.referencedEntities = {
                listEntity: {
                    entitySetName: 'TestSet',
                    semanticKeys: [],
                    entityPath: 'TestSet',
                    entityType: undefined
                }
            };

            const freshResetPrompt = result.questions.find(
                (q: any) => q.name === promptNames.toggleSelection
            ) as ConfirmQuestion;

            // Trigger the when function to load choices
            const whenFn = freshResetPrompt.when;
            if (typeof whenFn === 'function') {
                await whenFn({});
            }

            // Now call validate with reset=true
            const validateResult = freshResetPrompt.validate!(true);

            expect(validateResult).toBe(true);
            // All choices should be unchecked when reset is true
            expect(mockChoices[0].checked).toBe(false);
            expect(mockChoices[1].checked).toBe(false);
        });

        it('should restore default selection when reset is false (first call)', async () => {
            // Set up mock choices with defaultSelected values
            const mockChoices = [
                {
                    name: 'Entity1',
                    value: {
                        fullPath: 'to_Entity1',
                        entity: { entityPath: 'to_Entity1', entitySetName: 'Entity1Set', defaultSelected: true }
                    } as SelectedEntityAnswer,
                    checked: false
                },
                {
                    name: 'Entity2',
                    value: {
                        fullPath: 'to_Entity2',
                        entity: { entityPath: 'to_Entity2', entitySetName: 'Entity2Set', defaultSelected: false }
                    } as SelectedEntityAnswer,
                    checked: true
                },
                {
                    name: 'Entity3',
                    value: {
                        fullPath: 'to_Entity3',
                        entity: { entityPath: 'to_Entity3', entitySetName: 'Entity3Set', defaultSelected: true }
                    } as SelectedEntityAnswer,
                    checked: false
                }
            ];

            (promptHelpers.createEntityChoices as jest.Mock).mockReturnValue({
                choices: mockChoices,
                entitySetsFlat: {}
            });

            const result = await getODataDownloaderPrompts();
            const appConfig = result.answers.application;
            appConfig.servicePath = '/test/service';
            appConfig.referencedEntities = {
                listEntity: {
                    entitySetName: 'TestSet',
                    semanticKeys: [],
                    entityPath: 'TestSet',
                    entityType: undefined
                }
            };

            const freshResetPrompt = result.questions.find(
                (q: any) => q.name === promptNames.toggleSelection
            ) as ConfirmQuestion;

            // Trigger the when function to load choices
            const whenFn = freshResetPrompt.when;
            if (typeof whenFn === 'function') {
                await whenFn({});
            }

            // Call validate with reset=false to restore defaults
            const validateResult = freshResetPrompt.validate!(false);

            expect(validateResult).toBe(true);
            // Choices should be restored to their defaultSelected values
            expect(mockChoices[0].checked).toBe(true); // defaultSelected: true
            expect(mockChoices[1].checked).toBe(false); // defaultSelected: false
            expect(mockChoices[2].checked).toBe(true); // defaultSelected: true
        });

        it('should not modify choices when reset value is unchanged (same as previous)', async () => {
            const mockChoices = [
                {
                    name: 'Entity1',
                    value: {
                        fullPath: 'to_Entity1',
                        entity: { entityPath: 'to_Entity1', entitySetName: 'Entity1Set', defaultSelected: true }
                    } as SelectedEntityAnswer,
                    checked: true
                }
            ];

            (promptHelpers.createEntityChoices as jest.Mock).mockReturnValue({
                choices: mockChoices,
                entitySetsFlat: {}
            });

            const result = await getODataDownloaderPrompts();
            const appConfig = result.answers.application;
            appConfig.servicePath = '/test/service';
            appConfig.referencedEntities = {
                listEntity: {
                    entitySetName: 'TestSet',
                    semanticKeys: [],
                    entityPath: 'TestSet',
                    entityType: undefined
                }
            };

            const freshResetPrompt = result.questions.find(
                (q: any) => q.name === promptNames.toggleSelection
            ) as ConfirmQuestion;

            // Trigger the when function to load choices
            const whenFn = freshResetPrompt.when;
            if (typeof whenFn === 'function') {
                await whenFn({});
            }

            // First call with true - this sets previousReset to true and clears selections
            freshResetPrompt.validate!(true);
            expect(mockChoices[0].checked).toBe(false); // cleared

            // Manually set checked back to true to verify no change on second call
            mockChoices[0].checked = true;

            // Second call with same value (true) - should not modify choices
            const result2 = freshResetPrompt.validate!(true);

            expect(result2).toBe(true);
            expect(mockChoices[0].checked).toBe(true); // unchanged because reset === previousReset
        });

        it('should toggle between clear and restore on alternating calls', async () => {
            const mockChoices = [
                {
                    name: 'Entity1',
                    value: {
                        fullPath: 'to_Entity1',
                        entity: { entityPath: 'to_Entity1', entitySetName: 'Entity1Set', defaultSelected: true }
                    } as SelectedEntityAnswer,
                    checked: false
                },
                {
                    name: 'Entity2',
                    value: {
                        fullPath: 'to_Entity2',
                        entity: { entityPath: 'to_Entity2', entitySetName: 'Entity2Set', defaultSelected: false }
                    } as SelectedEntityAnswer,
                    checked: true
                }
            ];

            (promptHelpers.createEntityChoices as jest.Mock).mockReturnValue({
                choices: mockChoices,
                entitySetsFlat: {}
            });

            const result = await getODataDownloaderPrompts();
            const appConfig = result.answers.application;
            appConfig.servicePath = '/test/service';
            appConfig.referencedEntities = {
                listEntity: {
                    entitySetName: 'TestSet',
                    semanticKeys: [],
                    entityPath: 'TestSet',
                    entityType: undefined
                }
            };

            const freshResetPrompt = result.questions.find(
                (q: any) => q.name === promptNames.toggleSelection
            ) as ConfirmQuestion;

            // Trigger the when function to load choices
            const whenFn = freshResetPrompt.when;
            if (typeof whenFn === 'function') {
                await whenFn({});
            }

            // First call: reset=true -> clear all
            freshResetPrompt.validate!(true);
            expect(mockChoices[0].checked).toBe(false);
            expect(mockChoices[1].checked).toBe(false);

            // Second call: reset=false -> restore defaults
            freshResetPrompt.validate!(false);
            expect(mockChoices[0].checked).toBe(true); // defaultSelected: true
            expect(mockChoices[1].checked).toBe(false); // defaultSelected: false

            // Third call: reset=true again -> clear all
            freshResetPrompt.validate!(true);
            expect(mockChoices[0].checked).toBe(false);
            expect(mockChoices[1].checked).toBe(false);
        });

        it('should handle choices with undefined defaultSelected', async () => {
            const mockChoices = [
                {
                    name: 'Entity1',
                    value: {
                        fullPath: 'to_Entity1',
                        entity: { entityPath: 'to_Entity1', entitySetName: 'Entity1Set' } // no defaultSelected
                    } as SelectedEntityAnswer,
                    checked: true
                }
            ];

            (promptHelpers.createEntityChoices as jest.Mock).mockReturnValue({
                choices: mockChoices,
                entitySetsFlat: {}
            });

            const result = await getODataDownloaderPrompts();
            const appConfig = result.answers.application;
            appConfig.servicePath = '/test/service';
            appConfig.referencedEntities = {
                listEntity: {
                    entitySetName: 'TestSet',
                    semanticKeys: [],
                    entityPath: 'TestSet',
                    entityType: undefined
                }
            };

            const freshResetPrompt = result.questions.find(
                (q: any) => q.name === promptNames.toggleSelection
            ) as ConfirmQuestion;

            // Trigger the when function to load choices
            const whenFn = freshResetPrompt.when;
            if (typeof whenFn === 'function') {
                await whenFn({});
            }

            // Restore defaults - undefined defaultSelected should result in falsy (unchecked)
            freshResetPrompt.validate!(false);
            expect(mockChoices[0].checked).toBe(undefined); // defaultSelected is undefined
        });

        it('should handle empty choices array', async () => {
            (promptHelpers.createEntityChoices as jest.Mock).mockReturnValue({
                choices: [],
                entitySetsFlat: {}
            });

            const result = await getODataDownloaderPrompts();
            const appConfig = result.answers.application;
            appConfig.servicePath = '/test/service';
            appConfig.referencedEntities = {
                listEntity: {
                    entitySetName: 'TestSet',
                    semanticKeys: [],
                    entityPath: 'TestSet',
                    entityType: undefined
                }
            };

            const freshResetPrompt = result.questions.find(
                (q: any) => q.name === promptNames.toggleSelection
            ) as ConfirmQuestion;

            // Trigger the when function to load choices
            const whenFn = freshResetPrompt.when;
            if (typeof whenFn === 'function') {
                await whenFn({});
            }

            // Should not throw and should return true
            const validateResult = freshResetPrompt.validate!(true);
            expect(validateResult).toBe(true);
        });

        describe('when function', () => {
            it('should return false when no choices available', async () => {
                const result = await getODataDownloaderPrompts();
                const freshResetPrompt = result.questions.find(
                    (q: any) => q.name === promptNames.toggleSelection
                ) as ConfirmQuestion;

                const whenFn = freshResetPrompt.when;
                if (typeof whenFn === 'function') {
                    const shouldShow = await whenFn({});
                    expect(shouldShow).toBe(false);
                }
            });

            it('should return true when choices are available', async () => {
                const mockChoices = [
                    {
                        name: 'Entity1',
                        value: {
                            fullPath: 'to_Entity1',
                            entity: { entityPath: 'to_Entity1', entitySetName: 'Entity1Set' }
                        } as SelectedEntityAnswer,
                        checked: false
                    }
                ];

                (promptHelpers.createEntityChoices as jest.Mock).mockReturnValue({
                    choices: mockChoices,
                    entitySetsFlat: {}
                });

                const result = await getODataDownloaderPrompts();
                const appConfig = result.answers.application;
                appConfig.servicePath = '/test/service';
                appConfig.referencedEntities = {
                    listEntity: {
                        entitySetName: 'TestSet',
                        semanticKeys: [],
                        entityPath: 'TestSet',
                        entityType: undefined
                    }
                };

                const freshResetPrompt = result.questions.find(
                    (q: any) => q.name === promptNames.toggleSelection
                ) as ConfirmQuestion;

                const whenFn = freshResetPrompt.when;
                if (typeof whenFn === 'function') {
                    const shouldShow = await whenFn({});
                    expect(shouldShow).toBe(true);
                }
            });

            it('should load entity choices when service path changes', async () => {
                const mockChoices = [
                    {
                        name: 'Entity1',
                        value: {
                            fullPath: 'to_Entity1',
                            entity: { entityPath: 'to_Entity1', entitySetName: 'Entity1Set' }
                        } as SelectedEntityAnswer,
                        checked: false
                    }
                ];

                (promptHelpers.createEntityChoices as jest.Mock).mockReturnValue({
                    choices: mockChoices,
                    entitySetsFlat: { TestSet: {} }
                });

                const result = await getODataDownloaderPrompts();
                const appConfig = result.answers.application;
                appConfig.servicePath = '/test/service';
                appConfig.referencedEntities = {
                    listEntity: {
                        entitySetName: 'TestSet',
                        semanticKeys: [],
                        entityPath: 'TestSet',
                        entityType: undefined
                    }
                };

                const freshResetPrompt = result.questions.find(
                    (q: any) => q.name === promptNames.toggleSelection
                ) as ConfirmQuestion;

                const whenFn = freshResetPrompt.when;
                if (typeof whenFn === 'function') {
                    await whenFn({});
                    expect(promptHelpers.createEntityChoices).toHaveBeenCalledWith(
                        appConfig.referencedEntities?.listEntity,
                        appConfig.referencedEntities?.pageObjectEntities
                    );
                }
            });

            it('should not reload choices when service path is unchanged', async () => {
                const mockChoices = [
                    {
                        name: 'Entity1',
                        value: {
                            fullPath: 'to_Entity1',
                            entity: { entityPath: 'to_Entity1', entitySetName: 'Entity1Set' }
                        } as SelectedEntityAnswer,
                        checked: false
                    }
                ];

                (promptHelpers.createEntityChoices as jest.Mock).mockReturnValue({
                    choices: mockChoices,
                    entitySetsFlat: {}
                });

                const result = await getODataDownloaderPrompts();
                const appConfig = result.answers.application;
                appConfig.servicePath = '/test/service';
                appConfig.referencedEntities = {
                    listEntity: {
                        entitySetName: 'TestSet',
                        semanticKeys: [],
                        entityPath: 'TestSet',
                        entityType: undefined
                    }
                };

                const freshResetPrompt = result.questions.find(
                    (q: any) => q.name === promptNames.toggleSelection
                ) as ConfirmQuestion;

                const whenFn = freshResetPrompt.when;
                if (typeof whenFn === 'function') {
                    // First call - should load choices
                    await whenFn({});
                    expect(promptHelpers.createEntityChoices).toHaveBeenCalledTimes(1);

                    // Second call with same service path - should not reload
                    await whenFn({});
                    expect(promptHelpers.createEntityChoices).toHaveBeenCalledTimes(1);
                }
            });

            it('should reload choices when service path changes', async () => {
                const mockChoices1 = [
                    {
                        name: 'Entity1',
                        value: {
                            fullPath: 'to_Entity1',
                            entity: { entityPath: 'to_Entity1', entitySetName: 'Entity1Set' }
                        } as SelectedEntityAnswer,
                        checked: false
                    }
                ];

                const mockChoices2 = [
                    {
                        name: 'Entity2',
                        value: {
                            fullPath: 'to_Entity2',
                            entity: { entityPath: 'to_Entity2', entitySetName: 'Entity2Set' }
                        } as SelectedEntityAnswer,
                        checked: false
                    }
                ];

                (promptHelpers.createEntityChoices as jest.Mock)
                    .mockReturnValueOnce({ choices: mockChoices1, entitySetsFlat: {} })
                    .mockReturnValueOnce({ choices: mockChoices2, entitySetsFlat: {} });

                const result = await getODataDownloaderPrompts();
                const appConfig = result.answers.application;
                appConfig.servicePath = '/test/service1';
                appConfig.referencedEntities = {
                    listEntity: {
                        entitySetName: 'TestSet',
                        semanticKeys: [],
                        entityPath: 'TestSet',
                        entityType: undefined
                    }
                };

                const freshResetPrompt = result.questions.find(
                    (q: any) => q.name === promptNames.toggleSelection
                ) as ConfirmQuestion;

                const whenFn = freshResetPrompt.when;
                if (typeof whenFn === 'function') {
                    // First call
                    await whenFn({});
                    expect(promptHelpers.createEntityChoices).toHaveBeenCalledTimes(1);

                    // Change service path
                    appConfig.servicePath = '/test/service2';

                    // Second call with different service path - should reload
                    await whenFn({});
                    expect(promptHelpers.createEntityChoices).toHaveBeenCalledTimes(2);
                }
            });
        });
    });

    describe('Key Prompts', () => {
        let keyPrompts: InputQuestion[];

        beforeEach(async () => {
            (getHostEnvironment as jest.Mock).mockReturnValue(hostEnvironment.cli);
            (getSystemSelectionQuestions as jest.Mock).mockResolvedValue({
                prompts: [],
                answers: {}
            });

            const result = await getODataDownloaderPrompts();
            keyPrompts = result.questions.filter((q: any) => q.name?.startsWith('entityKeyIdx:')) as InputQuestion[];
        });

        it('should generate 5 key prompts', () => {
            expect(keyPrompts.length).toBe(5);
        });

        it('should have correct naming pattern', () => {
            keyPrompts.forEach((prompt, index) => {
                expect(prompt.name).toBe(`entityKeyIdx:${index}`);
                expect(prompt.type).toBe('input');
            });
        });

        it('should validate key value with invalid characters', () => {
            const keyPrompt = keyPrompts[0];
            // The validation checks if the entire value is in the invalidEntityKeyFilterChars array
            // which contains ['.'], so we need to pass '.' as the value
            const result = keyPrompt.validate!('.');

            expect(typeof result).toBe('string');
        });

        it('should validate key value successfully', () => {
            const keyPrompt = keyPrompts[0];
            const result = keyPrompt.validate!('validValue');

            expect(result).toBe(true);
        });

        it('should validate range values', () => {
            const keyPrompt = keyPrompts[0];
            const result = keyPrompt.validate!('1-10');

            expect(result).toBe(true);
        });

        it('should reject invalid range specification', () => {
            const keyPrompt = keyPrompts[0];
            const result = keyPrompt.validate!('1-10-20');

            expect(result).toBe("Invalid range specified, only the lowest and highest values allowed. e.g. '1-10'");
        });

        it('should validate boolean values', async () => {
            // Create a mock app config with a boolean key
            (getHostEnvironment as jest.Mock).mockReturnValue(hostEnvironment.cli);
            (getSystemSelectionQuestions as jest.Mock).mockResolvedValue({
                prompts: [],
                answers: {}
            });

            const result = await getODataDownloaderPrompts();
            const appConfig = result.answers.application;

            // Mock referenced entities with a boolean key
            appConfig.referencedEntities = {
                listEntity: {
                    entitySetName: 'TestSet',
                    semanticKeys: [{ name: 'IsActive', type: 'Edm.Boolean', value: undefined }],
                    entityPath: 'TestSet',
                    entityType: undefined
                }
            };

            // Get the key prompts with the updated appConfig context
            const newKeyPrompts = result.questions.filter((q: any) =>
                q.name?.startsWith('entityKeyIdx:')
            ) as InputQuestion[];
            const keyPrompt = newKeyPrompts[0];
            const validateResult = keyPrompt.validate!('true');

            expect(validateResult).toBe(true);
            expect(appConfig.referencedEntities?.listEntity.semanticKeys[0].value).toBe(true);
        });

        it('should reject invalid boolean values', async () => {
            (getHostEnvironment as jest.Mock).mockReturnValue(hostEnvironment.cli);
            (getSystemSelectionQuestions as jest.Mock).mockResolvedValue({
                prompts: [],
                answers: {}
            });

            const result = await getODataDownloaderPrompts();
            const appConfig = result.answers.application;

            appConfig.referencedEntities = {
                listEntity: {
                    entitySetName: 'TestSet',
                    semanticKeys: [{ name: 'IsActive', type: 'Edm.Boolean', value: undefined }],
                    entityPath: 'TestSet',
                    entityType: undefined
                }
            };

            // Get the key prompts with the updated appConfig context
            const newKeyPrompts = result.questions.filter((q: any) =>
                q.name?.startsWith('entityKeyIdx:')
            ) as InputQuestion[];
            const keyPrompt = newKeyPrompts[0];
            const validateResult = keyPrompt.validate!('notABoolean');

            expect(typeof validateResult).toBe('string');
        });
    });

    describe('Confirm Download Prompt', () => {
        let confirmPrompt: ConfirmQuestion;

        beforeEach(async () => {
            (getHostEnvironment as jest.Mock).mockReturnValue(hostEnvironment.cli);
            (getSystemSelectionQuestions as jest.Mock).mockResolvedValue({
                prompts: [],
                answers: { metadata: '<metadata></metadata>' }
            });

            const result = await getODataDownloaderPrompts();
            confirmPrompt = result.questions.find(
                (q: any) => q.name === promptNames.confirmDownload
            ) as ConfirmQuestion;
        });

        it('should have correct configuration', () => {
            expect(confirmPrompt).toBeDefined();
            expect(confirmPrompt.type).toBe('confirm');
            expect(confirmPrompt.name).toBe(promptNames.confirmDownload);
            expect(confirmPrompt.default).toBe(false);
            expect(confirmPrompt.guiOptions?.mandatory).toBe(true);
        });

        it('should validate successfully when download is confirmed', async () => {
            const mockResult = { odataQueryResult: [{ id: 1 }, { id: 2 }] };
            (promptHelpers.getData as jest.Mock).mockResolvedValue(mockResult);

            const result = await confirmPrompt.validate!(true, {} as Answers);

            expect(result).toBe(true);
            expect(promptHelpers.getData).toHaveBeenCalled();
        });

        it('should not fetch data when download is not confirmed', async () => {
            const result = await confirmPrompt.validate!(false, {} as Answers);

            expect(result).toBe(true);
            expect(promptHelpers.getData).not.toHaveBeenCalled();
        });

        it('should return error message when data fetch fails', async () => {
            (promptHelpers.getData as jest.Mock).mockResolvedValue('Error fetching data');

            const result = await confirmPrompt.validate!(true, {} as Answers);

            expect(result).toBe('Error fetching data');
        });

        it('should show success message with row count', async () => {
            const mockResult = { odataQueryResult: [{ id: 1 }, { id: 2 }, { id: 3 }] };
            (promptHelpers.getData as jest.Mock).mockResolvedValue(mockResult);

            await confirmPrompt.validate!(true, {} as Answers);
            const additionalMessageResult = confirmPrompt.additionalMessages!(true);
            const additionalMessage =
                additionalMessageResult instanceof Promise ? await additionalMessageResult : additionalMessageResult;

            expect(additionalMessage).toBeDefined();
            expect((additionalMessage as any)?.severity).toBe(Severity.information);
        });

        it('should not show additional message when download not confirmed', async () => {
            const additionalMessage = confirmPrompt.additionalMessages!(false);

            expect(additionalMessage).toBeUndefined();
        });
    });

    describe('Update Main Service Metadata Prompt', () => {
        let updateMetadataPrompt: ConfirmQuestion;

        beforeEach(async () => {
            (getHostEnvironment as jest.Mock).mockReturnValue(hostEnvironment.cli);
            (getSystemSelectionQuestions as jest.Mock).mockResolvedValue({
                prompts: [],
                answers: {}
            });

            const result = await getODataDownloaderPrompts();
            updateMetadataPrompt = result.questions.find(
                (q: any) => q.name === promptNames.updateMainServiceMetadata
            ) as ConfirmQuestion;
        });

        it('should have correct configuration', () => {
            expect(updateMetadataPrompt).toBeDefined();
            expect(updateMetadataPrompt.type).toBe('confirm');
            expect(updateMetadataPrompt.name).toBe(promptNames.updateMainServiceMetadata);
            expect(updateMetadataPrompt.default).toBe(false);
        });

        it('should show when app access, specification, and metadata are available', async () => {
            const mockAppAccess = {
                app: { appRoot: '/test/app' }
            };
            const mockSpec = { getApiVersion: () => ({ version: '24' }) };
            const mockMetadata = '<metadata></metadata>';
            const mockReferencedEntities = {
                listEntity: {
                    entitySetName: 'TestSet',
                    semanticKeys: [],
                    entityPath: 'TestSet',
                    entityType: undefined
                }
            };

            (getSystemSelectionQuestions as jest.Mock).mockResolvedValue({
                prompts: [],
                answers: { metadata: mockMetadata }
            });
            (getEntityModel as jest.Mock).mockResolvedValue(mockReferencedEntities);

            const result = await getODataDownloaderPrompts();
            const appConfig = result.answers.application;
            appConfig.appAccess = mockAppAccess as any;
            appConfig.specification = mockSpec as any;

            const updatePrompt = result.questions.find(
                (q: any) => q.name === promptNames.updateMainServiceMetadata
            ) as ConfirmQuestion;

            const whenFn = updatePrompt.when;
            if (typeof whenFn === 'function') {
                const shouldShow = await whenFn({});
                expect(shouldShow).toBe(true);
            }
        });

        it('should not show when metadata is missing', async () => {
            const result = await getODataDownloaderPrompts();
            const appConfig = result.answers.application;
            appConfig.appAccess = { app: { appRoot: '/test' } } as any;
            appConfig.specification = {} as any;

            const whenFn = updateMetadataPrompt.when;
            if (typeof whenFn === 'function') {
                const shouldShow = await whenFn({});
                expect(shouldShow).toBe(false);
            }
        });
    });

    describe('promptNames', () => {
        it('should export correct prompt names', () => {
            expect(promptNames.appSelection).toBe('appSelection');
            expect(promptNames.toggleSelection).toBe('toggleSelection');
            expect(promptNames.relatedEntitySelection).toBe('relatedEntitySelection');
            expect(promptNames.confirmDownload).toBe('confirmDownload');
            expect(promptNames.updateMainServiceMetadata).toBe('updateMainServiceMetadata');
        });
    });
});

import { jest } from '@jest/globals';
import { MessageType } from '@sap-devx/yeoman-ui-types';
import type { AppWizard } from '@sap-devx/yeoman-ui-types';

import type { ToolsLogger } from '@sap-ux/logger';
import type { CfConfig } from '@sap-ux/adp-tooling';
import type { ListQuestion } from '@sap-ux/inquirer-common';

const mockGetDefaultTargetFolder = jest.fn<typeof realFioriGenShared.getDefaultTargetFolder>();
const mockGetTargetEnvAdditionalMessages = jest.fn() as jest.Mock;
const mockValidateEnvironment = jest.fn() as jest.Mock;
const mockValidateProjectPath = jest.fn() as jest.Mock;
const mockValidateMtaId = jest.fn() as jest.Mock;
const mockIsMtaProject = jest.fn() as jest.Mock;

jest.unstable_mockModule('@sap-ux/adp-tooling', () => ({
    isMtaProject: mockIsMtaProject
}));

const realFioriGenShared = await import('@sap-ux/fiori-generator-shared');
jest.unstable_mockModule('@sap-ux/fiori-generator-shared', () => ({
    ...realFioriGenShared,
    getDefaultTargetFolder: mockGetDefaultTargetFolder
}));

jest.unstable_mockModule('../../../src/app/questions/helper/additional-messages', () => ({
    getTargetEnvAdditionalMessages: mockGetTargetEnvAdditionalMessages
}));

jest.unstable_mockModule('../../../src/app/questions/helper/validators', () => ({
    validateEnvironment: mockValidateEnvironment,
    validateProjectPath: mockValidateProjectPath,
    validateMtaId: mockValidateMtaId
}));

const { initI18n, t } = await import('../../../src/utils/i18n.js');
const { TargetEnv, MtaMode } = await import('../../../src/app/types.js');
import type { TargetEnvAnswers, ProjectLocationAnswers } from '../../../src/app/types.js';
const { getTargetEnvPrompt, getEnvironments, getProjectPathPrompt, getMtaModePrompt, getMtaIdPrompt } =
    await import('../../../src/app/questions/target-env.js');

describe('Target Environment', () => {
    const mockAppWizard: AppWizard = {
        showInformation: jest.fn()
    } as unknown as AppWizard;

    const mockLogger: ToolsLogger = {} as unknown as ToolsLogger;

    const mockCfConfig: CfConfig = {
        org: { GUID: 'org-guid', Name: 'test-org' },
        space: { GUID: 'space-guid', Name: 'test-space' },
        token: 'test-token',
        url: '/test.cf.com'
    };

    const mockVscode = {
        workspace: {
            workspaceFolders: [{ uri: { fsPath: '/test/workspace' } }]
        }
    };

    beforeAll(async () => {
        await initI18n();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getTargetEnvPrompt', () => {
        test('should create target environment prompt with correct structure', () => {
            const prompt = getTargetEnvPrompt(mockAppWizard, true, true, mockCfConfig);

            expect(prompt.type).toBe('list');
            expect(prompt.name).toBe('targetEnv');
            expect(prompt.message).toBe(t('prompts.targetEnvLabel'));
            expect(prompt.guiOptions).toEqual({
                mandatory: true,
                hint: t('prompts.targetEnvTooltip'),
                breadcrumb: t('prompts.targetEnvBreadcrumb')
            });
        });

        test('should have choices function that calls getEnvironments', () => {
            const envPrompt = getTargetEnvPrompt(
                mockAppWizard,
                true,
                true,
                mockCfConfig
            ) as ListQuestion<TargetEnvAnswers>;

            const choicesFn = envPrompt!.choices;
            expect(typeof choicesFn).toBe('function');

            const choices = (choicesFn as () => Promise<string[]>)();
            expect(choices).toEqual([
                { name: 'ABAP', value: TargetEnv.ABAP },
                { name: 'SAP BTP, Cloud Foundry environment', value: TargetEnv.CF }
            ]);
        });

        test('should have default function that calls getEnvironments', () => {
            const envPrompt = getTargetEnvPrompt(
                mockAppWizard,
                true,
                true,
                mockCfConfig
            ) as ListQuestion<TargetEnvAnswers>;

            const defaultFn = envPrompt!.default;
            expect(typeof defaultFn).toBe('function');

            const defaultChoice = (defaultFn as () => Promise<string[]>)();
            expect(defaultChoice).toEqual(TargetEnv.ABAP);
        });

        test('should set up validation function', () => {
            const prompt = getTargetEnvPrompt(mockAppWizard, true, true, mockCfConfig);

            const validateResult = prompt.validate!('ABAP');
            expect(mockValidateEnvironment).toHaveBeenCalledWith('ABAP', true, mockCfConfig);
            expect(validateResult).toBeUndefined();
        });

        test('should set up additional messages function', () => {
            const prompt = getTargetEnvPrompt(mockAppWizard, true, true, mockCfConfig);

            const additionalMessages = prompt.additionalMessages!('ABAP');
            expect(mockGetTargetEnvAdditionalMessages).toHaveBeenCalledWith('ABAP', true, mockCfConfig);
            expect(additionalMessages).toBeUndefined();
        });
    });

    describe('getEnvironments', () => {
        test('should return ABAP and CF choices when CF is installed', () => {
            const choices = getEnvironments(mockAppWizard, true);

            expect(choices).toHaveLength(2);
            expect(choices[0]).toEqual({ name: 'ABAP', value: TargetEnv.ABAP });
            expect(choices[1]).toEqual({ name: 'SAP BTP, Cloud Foundry environment', value: TargetEnv.CF });
            expect(mockAppWizard.showInformation).not.toHaveBeenCalled();
        });

        test('should return only ABAP choice when CF is not installed', () => {
            const choices = getEnvironments(mockAppWizard, false);

            expect(choices).toHaveLength(1);
            expect(choices[0]).toEqual({ name: 'ABAP', value: TargetEnv.ABAP });
            expect(mockAppWizard.showInformation).toHaveBeenCalledWith(t('error.cfNotInstalled'), MessageType.prompt);
        });

        test('should show information message when CF is not installed', () => {
            getEnvironments(mockAppWizard, false);

            expect(mockAppWizard.showInformation).toHaveBeenCalledWith(t('error.cfNotInstalled'), MessageType.prompt);
        });
    });

    describe('getProjectPathPrompt', () => {
        test('should create project path prompt with correct structure', () => {
            const prompt = getProjectPathPrompt(mockLogger, mockVscode);

            expect(prompt.type).toBe('input');
            expect(prompt.name).toBe('projectLocation');
            expect(prompt.message).toBe(t('prompts.projectLocationLabel'));
            expect(prompt.guiOptions).toEqual({
                type: 'folder-browser',
                mandatory: true,
                hint: t('prompts.projectLocationTooltip'),
                breadcrumb: t('prompts.projectLocationBreadcrumb')
            });
        });

        test('should set up validation function', () => {
            const prompt = getProjectPathPrompt(mockLogger, mockVscode);

            const validateResult = prompt.validate!('/test/path');
            expect(mockValidateProjectPath).toHaveBeenCalledWith('/test/path', mockLogger, undefined);
            expect(validateResult).toBeUndefined();
        });

        test('should thread the selected MTA mode into the validator', () => {
            const prompt = getProjectPathPrompt(mockLogger, mockVscode);

            prompt.validate!('/test/path', { mtaMode: MtaMode.New } as ProjectLocationAnswers);
            expect(mockValidateProjectPath).toHaveBeenCalledWith('/test/path', mockLogger, MtaMode.New);
        });

        test('should set up default function', () => {
            const mockDefaultPath = '/default/path';
            mockGetDefaultTargetFolder.mockReturnValue(mockDefaultPath);

            const prompt = getProjectPathPrompt(mockLogger, mockVscode);

            const defaultPath = prompt.default!();
            expect(mockGetDefaultTargetFolder).toHaveBeenCalledWith(mockVscode);
            expect(defaultPath).toBe(mockDefaultPath);
        });
    });

    describe('getMtaModePrompt', () => {
        test('should create the MTA mode prompt with new/existing choices', () => {
            const prompt = getMtaModePrompt() as ListQuestion<ProjectLocationAnswers>;

            expect(prompt.type).toBe('list');
            expect(prompt.name).toBe('mtaMode');
            expect(prompt.message).toBe(t('prompts.mtaModeLabel'));
            expect(prompt.default).toBe(MtaMode.New);
            expect(prompt.choices).toEqual([
                { name: t('prompts.mtaModeNewLabel'), value: MtaMode.New },
                { name: t('prompts.mtaModeExistingLabel'), value: MtaMode.Existing }
            ]);
            expect(prompt.guiOptions).toEqual({
                mandatory: true,
                hint: t('prompts.mtaModeTooltip'),
                breadcrumb: t('prompts.mtaModeBreadcrumb')
            });
        });
    });

    describe('getMtaIdPrompt', () => {
        test('should create the MTA id prompt with correct structure', () => {
            const prompt = getMtaIdPrompt();

            expect(prompt.type).toBe('input');
            expect(prompt.name).toBe('mtaId');
            expect(prompt.message).toBe(t('prompts.mtaIdLabel'));
            expect(prompt.guiOptions).toEqual({
                mandatory: true,
                hint: t('prompts.mtaIdTooltip'),
                breadcrumb: t('prompts.mtaIdBreadcrumb')
            });
        });

        test('should only be shown when creating a new MTA project in a folder that is not already an MTA project', () => {
            mockIsMtaProject.mockReturnValue(false);
            const prompt = getMtaIdPrompt();

            expect(prompt.when!({ mtaMode: MtaMode.New, projectLocation: '/parent' } as ProjectLocationAnswers)).toBe(
                true
            );
            expect(
                prompt.when!({ mtaMode: MtaMode.Existing, projectLocation: '/parent' } as ProjectLocationAnswers)
            ).toBe(false);
        });

        test('should be hidden when the selected root path is already an MTA project', () => {
            mockIsMtaProject.mockReturnValue(true);
            const prompt = getMtaIdPrompt();

            expect(
                prompt.when!({ mtaMode: MtaMode.New, projectLocation: '/existing-mta' } as ProjectLocationAnswers)
            ).toBe(false);
            expect(mockIsMtaProject).toHaveBeenCalledWith('/existing-mta');
        });

        test('should validate the MTA id against the selected parent location', () => {
            const prompt = getMtaIdPrompt();

            prompt.validate!('my-mta', { projectLocation: '/parent' } as ProjectLocationAnswers);
            expect(mockValidateMtaId).toHaveBeenCalledWith('my-mta', '/parent');
        });
    });
});

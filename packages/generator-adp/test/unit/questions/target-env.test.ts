import { MessageType } from '@sap-devx/yeoman-ui-types';
import type { AppWizard } from '@sap-devx/yeoman-ui-types';

import type { ToolsLogger } from '@sap-ux/logger';
import type { CfConfig } from '@sap-ux/adp-tooling';
import type { ListQuestion } from '@sap-ux/inquirer-common';
import { getDefaultTargetFolder } from '@sap-ux/fiori-generator-shared';

import { initI18n, t } from '../../../src/utils/i18n';
import { TargetEnv, type TargetEnvAnswers } from '../../../src/app/types';
import { getTargetEnvAdditionalMessages } from '../../../src/app/questions/helper/additional-messages';
import { validateEnvironment, validateProjectPath } from '../../../src/app/questions/helper/validators';
import { getTargetEnvPrompt, getEnvironments, getProjectPathPrompt } from '../../../src/app/questions/target-env';

jest.mock('@sap-ux/fiori-generator-shared', () => ({
    getDefaultTargetFolder: jest.fn()
}));

jest.mock('../../../src/app/questions/helper/additional-messages', () => ({
    getTargetEnvAdditionalMessages: jest.fn()
}));

jest.mock('../../../src/app/questions/helper/validators', () => ({
    validateEnvironment: jest.fn(),
    validateProjectPath: jest.fn()
}));

const mockValidateEnvironment = validateEnvironment as jest.MockedFunction<typeof validateEnvironment>;
const mockValidateProjectPath = validateProjectPath as jest.MockedFunction<typeof validateProjectPath>;
const mockGetDefaultTargetFolder = getDefaultTargetFolder as jest.MockedFunction<typeof getDefaultTargetFolder>;
const mockGetTargetEnvAdditionalMessages = getTargetEnvAdditionalMessages as jest.MockedFunction<
    typeof getTargetEnvAdditionalMessages
>;

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
            const prompt = getTargetEnvPrompt(mockAppWizard, true, true, mockCfConfig, mockVscode);

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
                mockCfConfig,
                mockVscode
            ) as ListQuestion<TargetEnvAnswers>;

            const choicesFn = envPrompt!.choices;
            expect(typeof choicesFn).toBe('function');

            const choices = (choicesFn as () => Promise<string[]>)();
            expect(choices).toEqual([
                { name: 'ABAP', value: TargetEnv.ABAP },
                { name: 'Cloud Foundry', value: TargetEnv.CF }
            ]);
        });

        test('should have default function that calls getEnvironments', () => {
            const envPrompt = getTargetEnvPrompt(
                mockAppWizard,
                true,
                true,
                mockCfConfig,
                mockVscode
            ) as ListQuestion<TargetEnvAnswers>;

            const defaultFn = envPrompt!.default;
            expect(typeof defaultFn).toBe('function');

            const defaultChoice = (defaultFn as () => Promise<string[]>)();
            expect(defaultChoice).toEqual(TargetEnv.ABAP);
        });

        test('should set up validation function', () => {
            const prompt = getTargetEnvPrompt(mockAppWizard, true, true, mockCfConfig, mockVscode);

            const validateResult = prompt.validate!('ABAP');
            expect(mockValidateEnvironment).toHaveBeenCalledWith('ABAP', true, mockVscode);
            expect(validateResult).toBeUndefined();
        });

        test('should set up additional messages function', () => {
            const prompt = getTargetEnvPrompt(mockAppWizard, true, true, mockCfConfig, mockVscode);

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
            expect(choices[1]).toEqual({ name: 'Cloud Foundry', value: TargetEnv.CF });
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
            expect(mockValidateProjectPath).toHaveBeenCalledWith('/test/path', mockLogger);
            expect(validateResult).toBeUndefined();
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
});

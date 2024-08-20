import * as validators from '@sap-ux/project-input-validator';
import * as i18n from '../../../../../src/i18n';
import { FlexLayer } from '../../../../../src/types';
import type { BasicInfoAnswers } from '../../../../../src/types';
import {
    getBasicInfoPrompts,
    getDefaultProjectName,
    getProjectNameTooltip,
    getProjectNames
} from '../../../../../src/prompts/creation';
jest.mock('@sap-ux/project-input-validator');
jest.mock('fs');

jest.mock('../../../../../src/prompts/creation/questions/helper/tooltips.ts', () => ({
    getProjectNameTooltip: jest.fn()
}));

jest.mock('../../../../../src/prompts/creation/questions/helper/default-values.ts', () => ({
    ...jest.requireActual('../../../../../src/prompts/creation/questions/helper/default-values.ts'),
    getProjectNames: jest.fn(),
    getDefaultProjectName: jest.fn()
}));

const getProjectNameTooltipMock = getProjectNameTooltip as jest.Mock;
const getProjectNamesMock = getProjectNames as jest.Mock;
const getDefaultProjectNameMock = getDefaultProjectName as jest.Mock;

describe('getPrompts', () => {
    beforeAll(async () => {
        await i18n.initI18n();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        getProjectNameTooltipMock.mockReturnValueOnce('some hint');
    });

    it('should return prompts - CUSTOMER_BASE layer', () => {
        const prompts = getBasicInfoPrompts('/path', FlexLayer.CUSTOMER_BASE);
        expect(prompts).toEqual([
            {
                type: 'input',
                name: 'projectName',
                message: 'Project Name',
                default: expect.any(Function),
                guiOptions: {
                    mandatory: true,
                    hint: 'some hint',
                    breadcrumb: 'Project Name'
                },
                validate: expect.any(Function),
                store: false
            },
            {
                type: 'input',
                name: 'applicationTitle',
                message: i18n.t('prompts.appTitleLabel'),
                default: i18n.t('prompts.appTitleDefault'),
                guiOptions: {
                    mandatory: true,
                    hint: i18n.t('prompts.appTitleTooltip'),
                    breadcrumb: i18n.t('prompts.appTitleLabel')
                },
                validate: expect.any(Function),
                store: false
            },
            {
                type: 'input',
                name: 'namespace',
                message: i18n.t('prompts.namespaceLabel'),
                guiOptions: {
                    applyDefaultWhenDirty: true,
                    mandatory: true,
                    breadcrumb: i18n.t('prompts.namespaceLabel')
                },
                default: expect.any(Function),
                store: false,
                validate: expect.any(Function)
            }
        ]);
    });

    it('should return prompts - VENDOR layer', () => {
        const prompts = getBasicInfoPrompts('/path', FlexLayer.VENDOR);
        expect(prompts).toEqual([
            {
                type: 'input',
                name: 'projectName',
                message: 'Project Name',
                default: expect.any(Function),
                guiOptions: {
                    mandatory: true,
                    hint: 'some hint',
                    breadcrumb: 'Project Name'
                },
                validate: expect.any(Function),
                store: false
            },
            {
                type: 'input',
                name: 'applicationTitle',
                message: i18n.t('prompts.appTitleLabel'),
                default: i18n.t('prompts.appTitleDefault'),
                guiOptions: {
                    mandatory: true,
                    hint: i18n.t('prompts.appTitleTooltip'),
                    breadcrumb: i18n.t('prompts.appTitleLabel')
                },
                validate: expect.any(Function),
                store: false
            },
            {
                type: 'input',
                name: 'namespace',
                message: i18n.t('prompts.namespaceLabel'),
                guiOptions: {
                    applyDefaultWhenDirty: true,
                    type: 'label'
                },
                default: expect.any(Function),
                store: false,
                when: expect.any(Function)
            }
        ]);
    });

    it('should get default values', () => {
        getProjectNamesMock.mockReturnValue([]);
        getDefaultProjectNameMock.mockReturnValue('app.variant1');
        const prompts = getBasicInfoPrompts('/path', FlexLayer.CUSTOMER_BASE);
        const projectNamePrompt = prompts.find((prompt) => prompt.name === 'projectName');
        const namespacePrompt = prompts.find((prompt) => prompt.name === 'namespace');
        expect(projectNamePrompt?.default()).toBe('app.variant1');
        expect(namespacePrompt?.default({ projectName: 'app.variant1' } as BasicInfoAnswers)).toBe(
            'customer.app.variant1'
        );
    });

    it('should pass with valid project name', () => {
        jest.spyOn(validators, 'validateProjectName').mockReturnValue(true);
        const prompts = getBasicInfoPrompts('/path', FlexLayer.CUSTOMER_BASE);
        const projectNamePrompt = prompts.find((prompt) => prompt.name === 'projectName') as any;
        expect(projectNamePrompt.validate('app.variant1')).toBeTruthy();
    });

    it('should fail with invalid project name', () => {
        jest.spyOn(validators, 'validateProjectName').mockReturnValue('Input cannot be empty');
        const prompts = getBasicInfoPrompts('/path', FlexLayer.CUSTOMER_BASE);
        const projectNamePrompt = prompts.find((prompt) => prompt.name === 'projectName') as any;
        expect(projectNamePrompt.validate('')).toBe('Input cannot be empty');
    });

    it('should pass with valid application title', () => {
        jest.spyOn(validators, 'validateEmptyString').mockReturnValue(true);
        const prompts = getBasicInfoPrompts('/path', FlexLayer.CUSTOMER_BASE);
        const appTitlePrompt = prompts.find((prompt) => prompt.name === 'applicationTitle') as any;
        expect(appTitlePrompt.validate('Application Title')).toBeTruthy();
    });

    it('should fail with empty application title', () => {
        jest.spyOn(validators, 'validateEmptyString').mockReturnValue('Input cannot be empty');
        const prompts = getBasicInfoPrompts('/path', FlexLayer.CUSTOMER_BASE);
        const appTitlePrompt = prompts.find((prompt) => prompt.name === 'applicationTitle') as any;
        expect(appTitlePrompt.validate('')).toBe('Input cannot be empty');
    });

    it('should be visible namespace prompt when project name is typed', () => {
        const prompts = getBasicInfoPrompts('/path', FlexLayer.VENDOR);
        const namespacePrompt = prompts.find((prompt) => prompt.name === 'namespace') as any;
        expect(namespacePrompt.when({ projectName: 'app.variant1' })).toBeTruthy();
    });

    it('should not be visible namespace prompt when project name is empty', () => {
        const prompts = getBasicInfoPrompts('/path', FlexLayer.VENDOR);
        const namespacePrompt = prompts.find((prompt) => prompt.name === 'namespace') as any;
        expect(namespacePrompt.when({ projectName: '' })).toBeFalsy();
    });

    it('should pass with valid namespace', () => {
        jest.spyOn(validators, 'validateNamespaceAdp').mockReturnValue(true);
        const prompts = getBasicInfoPrompts('/path', FlexLayer.CUSTOMER_BASE);
        const namespacePrompt = prompts.find((prompt) => prompt.name === 'namespace') as any;
        expect(namespacePrompt.validate('customer.app.variant1', { projectName: 'app.variant1' })).toBeTruthy();
    });

    it('should fail with invalid namespace', () => {
        jest.spyOn(validators, 'validateNamespaceAdp').mockReturnValue('Input cannot be empty');
        const prompts = getBasicInfoPrompts('/path', FlexLayer.CUSTOMER_BASE);
        const namespacePrompt = prompts.find((prompt) => prompt.name === 'namespace') as any;
        expect(namespacePrompt.validate('', { projectName: 'app.variant1' })).toBe('Input cannot be empty');
    });
});

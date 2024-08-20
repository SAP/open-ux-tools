import * as fs from 'fs';
import * as i18n from '../../../../src/i18n';
import { getBasicInfoPrompts } from '../../../../src/prompts/creation';
import type { BasicInfoAnswers } from '../../../../src/types';
import { FlexLayer } from '../../../../src/types';
// import * as promptHelper from '../../../../src/prompts/creation/questions/basic';
// import * as fileSystem from '../../../../src/base/file-system';

jest.mock('fs');

describe('getPrompts', () => {
    beforeAll(async () => {
        await i18n.initI18n();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        // jest.spyOn(promptHelper, 'getProjectNameTooltip').mockReturnValueOnce('some hint');
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
        // jest.spyOn(fileSystem, 'getProjectNames').mockReturnValue([]);
        const prompts = getBasicInfoPrompts('/path', FlexLayer.CUSTOMER_BASE);
        const projectNamePrompt = prompts.find((prompt) => prompt.name === 'projectName');
        const namespacePrompt = prompts.find((prompt) => prompt.name === 'namespace');
        expect(projectNamePrompt?.default()).toBe('app.variant1');
        expect(namespacePrompt?.default({ projectName: 'app.variant1' } as BasicInfoAnswers)).toBe(
            'customer.app.variant1'
        );
    });

    it('should pass with valid project name', () => {
        jest.spyOn(fs, 'existsSync').mockReturnValueOnce(false);
        const prompts = getBasicInfoPrompts('/path', FlexLayer.CUSTOMER_BASE);
        const projectNamePrompt = prompts.find((prompt) => prompt.name === 'projectName') as any;
        expect(projectNamePrompt.validate('app.variant1')).toBeTruthy();
    });

    it('should fail with invalid project name', () => {
        jest.spyOn(fs, 'existsSync').mockReturnValueOnce(true);
        const prompts = getBasicInfoPrompts('/path', FlexLayer.CUSTOMER_BASE);
        const projectNamePrompt = prompts.find((prompt) => prompt.name === 'projectName') as any;
        expect(projectNamePrompt.validate('app.variant1')).toBe(
            'Project with this name already exists in your workspace'
        );
    });

    it('should pass with valid application title', () => {
        const prompts = getBasicInfoPrompts('/path', FlexLayer.CUSTOMER_BASE);
        const appTitlePrompt = prompts.find((prompt) => prompt.name === 'applicationTitle') as any;
        expect(appTitlePrompt.validate('Application Title')).toBeTruthy();
    });

    it('should fail with empty application title', () => {
        const prompts = getBasicInfoPrompts('/path', FlexLayer.CUSTOMER_BASE);
        const appTitlePrompt = prompts.find((prompt) => prompt.name === 'applicationTitle') as any;
        expect(appTitlePrompt.validate('')).toBe(i18n.t('validators.cannotBeEmpty'));
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
        const prompts = getBasicInfoPrompts('/path', FlexLayer.CUSTOMER_BASE);
        const namespacePrompt = prompts.find((prompt) => prompt.name === 'namespace') as any;
        expect(namespacePrompt.validate('customer.app.variant1', { projectName: 'app.variant1' })).toBeTruthy();
    });

    it('should faile with invalid namespace', () => {
        const prompts = getBasicInfoPrompts('/path', FlexLayer.CUSTOMER_BASE);
        const namespacePrompt = prompts.find((prompt) => prompt.name === 'namespace') as any;
        expect(namespacePrompt.validate('customer.app@variant1', { projectName: 'app.variant1' })).toBeTruthy();
    });
});

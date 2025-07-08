import { Severity } from '@sap-devx/yeoman-ui-types';
import { validateText } from '@sap-ux/project-input-validator';

import {
    getActionPrompt,
    getOverwritePrompt,
    getSemanticObjectPrompt,
    getSubTitlePrompt,
    getTitlePrompt
} from '../../../src/prompts/questions';
import { initI18n, t } from '../../../src/i18n';
import { type FLPConfigAnswers, promptNames } from '../../../src/types';

jest.mock('@sap-ux/project-input-validator', () => ({
    ...jest.requireActual('@sap-ux/project-input-validator'),
    validateText: jest.fn()
}));

describe('basic prompts', () => {
    const inbounds = {
        'display-bank': {
            semanticObject: 'test',
            action: 'action',
            title: 'testTitle',
            subTitle: 'testSubTitle',
            icon: 'sap-icon://test',
            additionalParameters: {}
        }
    };
    const choices = Object.entries(inbounds).map(([inboundId, data]) => ({
        name: inboundId,
        value: data
    }));

    beforeAll(async () => {
        await initI18n();
    });

    describe('getSemanticObjectPrompt', () => {
        const mockValidateText = validateText as jest.Mock;

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should create a prompt with the correct default properties', () => {
            const options = { default: 'DefaultSemanticObject' };
            const prompt = getSemanticObjectPrompt(true, options);

            expect(prompt).toEqual({
                name: promptNames.semanticObject,
                type: 'input',
                guiOptions: {
                    mandatory: true,
                    breadcrumb: true
                },
                message: t('prompts.semanticObject'),
                default: expect.any(Function),
                filter: expect.any(Function),
                validate: expect.any(Function)
            });
        });

        it('should set default to empty string if no options are provided', () => {
            const prompt = getSemanticObjectPrompt(true);

            expect(prompt.default()).toBe('');
        });

        it('should set default to selected inbound with added _New suffix', () => {
            const prompt = getSemanticObjectPrompt(true);

            expect(prompt.default({ inboundId: { ...choices[0].value } })).toBe('test_New');
        });

        it('should set default to provided value if options.default is given', () => {
            const options = { default: 'TestSemanticObject' };
            const prompt = getSemanticObjectPrompt(true, options);

            expect(prompt.default(choices[0].value)).toBe('TestSemanticObject');
        });

        it('should show tooltip if requested via the options', () => {
            const options = { showTooltip: true };
            const prompt = getSemanticObjectPrompt(true, options);

            expect(prompt.guiOptions?.hint).toBe(t('tooltips.semObjectActionDuplication'));
        });

        it('should trim the input value in the filter function', () => {
            const prompt = getSemanticObjectPrompt(true);
            const filterFn = prompt.filter as (val: string) => string;

            expect(filterFn('   trimmedValue   ')).toBe('trimmedValue');
            expect(filterFn('')).toBe('');
        });

        it('should validate the input value using validateText', () => {
            mockValidateText.mockReturnValue(true);

            const prompt = getSemanticObjectPrompt(true);
            const validateFn = prompt.validate as (val: string) => boolean;

            const result = validateFn('testValue');

            expect(mockValidateText).toHaveBeenCalledWith('testValue', true, 30, ['_']);
            expect(result).toBe(true);
        });

        it('should fail validation if validateText returns false', () => {
            mockValidateText.mockReturnValue(false);

            const prompt = getSemanticObjectPrompt(true);
            const validateFn = prompt.validate as (val: string) => boolean;

            const result = validateFn('invalidValue');

            expect(mockValidateText).toHaveBeenCalledWith('invalidValue', true, 30, ['_']);
            expect(result).toBe(false);
        });
    });

    describe('getActionPrompt', () => {
        const mockValidateText = validateText as jest.Mock;

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should return a prompt configuration with correct properties', () => {
            const options = { default: 'defaultAction' };
            const prompt = getActionPrompt(true, options);

            expect(prompt).toEqual({
                name: promptNames.action,
                type: 'input',
                guiOptions: {
                    mandatory: true,
                    breadcrumb: true
                },
                message: t('prompts.action'),
                default: expect.any(Function),
                filter: expect.any(Function),
                validate: expect.any(Function)
            });
        });

        it('should trim the input value in the filter function', () => {
            const prompt = getActionPrompt(true);
            const filterFn = prompt.filter as (val: string) => string;

            expect(filterFn('   actionValue   ')).toBe('actionValue');
            expect(filterFn('')).toBe('');
        });

        it('should set default to provided value if options.default is given', () => {
            const options = { default: 'TestAction' };
            const prompt = getActionPrompt(true, options);

            expect(prompt.default(choices[0].value)).toBe('TestAction');
        });

        it('should set default to selected inbound with added _New suffix', () => {
            const prompt = getActionPrompt(true);

            expect(prompt.default({ inboundId: { ...choices[0].value } })).toBe('action_New');
        });

        it('should show tooltip if requested via the options', () => {
            const options = { showTooltip: true };
            const prompt = getActionPrompt(true, options);

            expect(prompt.guiOptions?.hint).toBe(t('tooltips.semObjectActionDuplication'));
        });

        it('should validate the input value using validateText', () => {
            mockValidateText.mockReturnValue(true);

            const prompt = getActionPrompt(true);
            const validateFn = prompt.validate as (val: string) => boolean;

            const result = validateFn('validAction');

            expect(mockValidateText).toHaveBeenCalledWith('validAction', true, 60, ['_']);
            expect(result).toBe(true);
        });

        it('should fail validation if validateText returns false', () => {
            mockValidateText.mockReturnValue(false);

            const prompt = getActionPrompt(true);
            const validateFn = prompt.validate as (val: string) => boolean;

            const result = validateFn('invalidAction!');

            expect(mockValidateText).toHaveBeenCalledWith('invalidAction!', true, 60, ['_']);
            expect(result).toBe(false);
        });

        it('should set default to undefined if no options are provided', () => {
            const prompt = getActionPrompt(true);

            expect(prompt.default()).toBe('');
        });

        it('should validate for duplicates if request via options', () => {
            mockValidateText.mockReturnValue(true);
            const prompt = getActionPrompt(true, { executeDuplicateValidation: true }, inbounds);

            const validationResult = (prompt.validate as Function)(inbounds['display-bank'].action, {
                semanticObject: inbounds['display-bank'].semanticObject
            } as FLPConfigAnswers);
            expect(validationResult).toBe(t('validators.duplicateInbound'));
        });

        it('should skip validation for duplicates if request via options', () => {
            mockValidateText.mockReturnValue(true);
            const prompt = getActionPrompt(true, { executeDuplicateValidation: false }, inbounds);

            const validationResult = (prompt.validate as Function)(inbounds['display-bank'].action, {
                semanticObject: inbounds['display-bank'].semanticObject
            } as FLPConfigAnswers);
            expect(validationResult).toBe(true);
        });
    });

    describe('getOverwritePrompt', () => {
        const existingKeyRef = { value: false };

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should return a prompt configuration with correct properties', () => {
            const options = { default: true };

            const prompt = getOverwritePrompt(['so1-act1'], true, existingKeyRef, options);

            expect(prompt).toEqual({
                type: 'confirm',
                name: promptNames.overwrite,
                message: expect.any(Function),
                guiOptions: {
                    applyDefaultWhenDirty: true
                },
                default: true,
                when: expect.any(Function),
                additionalMessages: expect.any(Function)
            });
        });

        it('should correctly format the message for CLI', () => {
            const prompt = getOverwritePrompt([], true, existingKeyRef);
            const messageFn = prompt.message as (previousAnswers: any) => string;

            const result = messageFn({ semanticObject: 'so1', action: 'act1' });

            expect(result).toBe(
                'An inbound configuration with the key: so1-act1 is already defined. Choose another key. Overwrite existing configuration?'
            );
        });

        it('should evaluate "when" correctly based on inboundKeys and existingKeyRef', () => {
            const prompt = getOverwritePrompt(['so1-act1'], false, existingKeyRef);
            const whenFn = prompt.when as (previousAnswers: any) => boolean;

            const result = whenFn({ semanticObject: 'so1', action: 'act1' });

            expect(existingKeyRef.value).toBe(true);
            expect(result).toBe(true);
        });

        it('should provide additionalMessages with correct severity and message', () => {
            const prompt = getOverwritePrompt([], false, existingKeyRef);
            const additionalMessagesFn = prompt.additionalMessages as (val: any, previousAnswers: any) => any;

            const result = additionalMessagesFn(null, { semanticObject: 'so1', action: 'act1' });

            expect(result).toEqual({
                message: 'An inbound configuration with the key: so1-act1 is already defined. Choose another key.',
                severity: Severity.warning
            });
        });

        it('should use default behavior if options.default is not provided', () => {
            const prompt = getOverwritePrompt([], false, existingKeyRef);
            const defaultFn = prompt.default as () => boolean;

            const result = defaultFn();

            expect(result).toBe(false);
        });
    });

    describe('getTitlePrompt', () => {
        const mockValidateText = validateText as jest.Mock;

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should return a prompt configuration with correct properties', () => {
            const existingKeyRef = { value: false };
            const options = { default: 'Default Title' };

            const prompt = getTitlePrompt(existingKeyRef, false, true, options);

            expect(prompt).toEqual({
                when: expect.any(Function),
                name: promptNames.title,
                type: 'input',
                guiOptions: {
                    mandatory: true,
                    breadcrumb: true
                },
                message: t('prompts.title'),
                default: expect.any(Function),
                filter: expect.any(Function),
                validate: expect.any(Function)
            });
        });

        it('should set default to provided value if options.default is given', () => {
            const existingKeyRef = { value: false };
            const options = { default: 'Test Title' };

            const prompt = getTitlePrompt(existingKeyRef, false, true, options);

            expect(prompt.default({})).toBe('Test Title');
        });

        it('should execute the "when" function correctly', () => {
            const existingKeyRef = { value: true };

            const prompt = getTitlePrompt(existingKeyRef, false, true);
            const whenFn = prompt.when as (answers: { overwrite?: boolean }) => boolean;

            expect(whenFn({ overwrite: true })).toBe(true);
            expect(whenFn({ overwrite: false })).toBe(false);

            existingKeyRef.value = false;
            expect(whenFn({ overwrite: false })).toBe(true);
        });

        it('should trim the input value in the filter function', () => {
            const prompt = getTitlePrompt({ value: false }, false, true);
            const filterFn = prompt.filter as (val: string) => string;

            expect(filterFn('   Title Value   ')).toBe('Title Value');
            expect(filterFn('')).toBe('');
        });

        it('should validate the input value using validateText', () => {
            mockValidateText.mockReturnValue(true);

            const prompt = getTitlePrompt({ value: false }, false, true);
            const validateFn = prompt.validate as (val: string) => boolean;

            const result = validateFn('Valid Title');

            expect(mockValidateText).toHaveBeenCalledWith('Valid Title', true, 0);
            expect(result).toBe(true);
        });

        it('should fail validation if validateText returns false', () => {
            mockValidateText.mockReturnValue(false);

            const prompt = getTitlePrompt({ value: false }, false, true);
            const validateFn = prompt.validate as (val: string) => boolean;

            const result = validateFn('Invalid Title');

            expect(mockValidateText).toHaveBeenCalledWith('Invalid Title', true, 0);
            expect(result).toBe(false);
        });

        it('should set default to undefined if no options are provided', () => {
            const prompt = getTitlePrompt({ value: false }, false, true);

            expect(prompt.default()).toBe('');
        });
    });

    describe('getSubTitlePrompt', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should return a prompt configuration with correct properties', () => {
            const existingKeyRef = { value: false };
            const options = { default: 'Default Subtitle' };

            const prompt = getSubTitlePrompt(existingKeyRef, false, options);

            expect(prompt).toEqual({
                when: expect.any(Function),
                name: promptNames.subTitle,
                type: 'input',
                guiOptions: {
                    breadcrumb: t('prompts.subTitle')
                },
                message: t('prompts.subTitle'),
                default: expect.any(Function),
                filter: expect.any(Function)
            });
        });

        it('should set default to provided value if options.default is given', () => {
            const existingKeyRef = { value: false };
            const options = { default: 'Test Subtitle' };

            const prompt = getSubTitlePrompt(existingKeyRef, false, options);

            expect(prompt.default({})).toBe('Test Subtitle');
        });

        it('should execute the "when" function correctly', () => {
            const existingKeyRef = { value: true };

            const prompt = getSubTitlePrompt(existingKeyRef, false);
            const whenFn = prompt.when as (answers: { overwrite?: boolean }) => boolean;

            expect(whenFn({ overwrite: true })).toBe(true);
            expect(whenFn({ overwrite: false })).toBe(false);

            existingKeyRef.value = false;
            expect(whenFn({ overwrite: false })).toBe(true);
        });

        it('should trim the input value in the filter function', () => {
            const prompt = getSubTitlePrompt({ value: false }, false);
            const filterFn = prompt.filter as (val: string) => string;

            expect(filterFn('   Subtitle Value   ')).toBe('Subtitle Value');
            expect(filterFn('')).toBe('');
        });

        it('should set default to undefined if no options are provided', () => {
            const prompt = getSubTitlePrompt({ value: false }, false);

            expect(prompt.default()).toBe('');
        });
    });
});

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
import { promptNames } from '../../../src/types';

jest.mock('@sap-ux/project-input-validator', () => ({
    ...jest.requireActual('@sap-ux/project-input-validator'),
    validateText: jest.fn()
}));

describe('basic prompts', () => {
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
            const prompt = getSemanticObjectPrompt(options);

            expect(prompt).toEqual({
                name: promptNames.semanticObject,
                type: 'input',
                guiOptions: {
                    mandatory: true,
                    breadcrumb: true
                },
                message: t('prompts.semanticObject'),
                default: 'DefaultSemanticObject',
                filter: expect.any(Function),
                validate: expect.any(Function)
            });
        });

        it('should set default to undefined if no options are provided', () => {
            const prompt = getSemanticObjectPrompt();

            expect(prompt.default).toBeUndefined();
        });

        it('should trim the input value in the filter function', () => {
            const prompt = getSemanticObjectPrompt();
            const filterFn = prompt.filter as (val: string) => string;

            expect(filterFn('   trimmedValue   ')).toBe('trimmedValue');
            expect(filterFn('')).toBe('');
        });

        it('should validate the input value using validateText', () => {
            mockValidateText.mockReturnValue(true);

            const prompt = getSemanticObjectPrompt();
            const validateFn = prompt.validate as (val: string) => boolean;

            const result = validateFn('testValue');

            expect(mockValidateText).toHaveBeenCalledWith('testValue', 30, ['_']);
            expect(result).toBe(true);
        });

        it('should fail validation if validateText returns false', () => {
            mockValidateText.mockReturnValue(false);

            const prompt = getSemanticObjectPrompt();
            const validateFn = prompt.validate as (val: string) => boolean;

            const result = validateFn('invalidValue');

            expect(mockValidateText).toHaveBeenCalledWith('invalidValue', 30, ['_']);
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
            const prompt = getActionPrompt(options);

            expect(prompt).toEqual({
                name: promptNames.action,
                type: 'input',
                guiOptions: {
                    mandatory: true,
                    breadcrumb: true
                },
                message: t('prompts.action'),
                default: 'defaultAction',
                filter: expect.any(Function),
                validate: expect.any(Function)
            });
        });

        it('should trim the input value in the filter function', () => {
            const prompt = getActionPrompt();
            const filterFn = prompt.filter as (val: string) => string;

            expect(filterFn('   actionValue   ')).toBe('actionValue');
            expect(filterFn('')).toBe('');
        });

        it('should validate the input value using validateText', () => {
            mockValidateText.mockReturnValue(true);

            const prompt = getActionPrompt();
            const validateFn = prompt.validate as (val: string) => boolean;

            const result = validateFn('validAction');

            expect(mockValidateText).toHaveBeenCalledWith('validAction', 60, ['_']);
            expect(result).toBe(true);
        });

        it('should fail validation if validateText returns false', () => {
            mockValidateText.mockReturnValue(false);

            const prompt = getActionPrompt();
            const validateFn = prompt.validate as (val: string) => boolean;

            const result = validateFn('invalidAction!');

            expect(mockValidateText).toHaveBeenCalledWith('invalidAction!', 60, ['_']);
            expect(result).toBe(false);
        });

        it('should set default to undefined if no options are provided', () => {
            const prompt = getActionPrompt();

            expect(prompt.default).toBeUndefined();
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
                "An inbound configuration with the key: 'so1-act1' is already defined. Overwrite existing configuration?"
            );
        });

        it('should evaluate "when" correctly based on inboundKeys and existingKeyRef', () => {
            const prompt = getOverwritePrompt(['so1-act1'], false, existingKeyRef);
            const whenFn = prompt.when as (previousAnswers: any) => boolean;

            const result = whenFn({ semanticObject: 'so1', action: 'act1' });

            expect(existingKeyRef.value).toBe(true);
            expect(result).toBe(true);
        });

        it('should return false for "when" if options.hide is true', () => {
            const options = { hide: true };

            const prompt = getOverwritePrompt([], false, existingKeyRef, options);
            const whenFn = prompt.when as boolean;

            expect(whenFn).toBe(false);
        });

        it('should provide additionalMessages with correct severity and message', () => {
            const prompt = getOverwritePrompt([], false, existingKeyRef);
            const additionalMessagesFn = prompt.additionalMessages as (val: any, previousAnswers: any) => any;

            const result = additionalMessagesFn(null, { semanticObject: 'so1', action: 'act1' });

            expect(result).toEqual({
                message: "An inbound configuration with the key: 'so1-act1' is already defined.",
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

            const prompt = getTitlePrompt(existingKeyRef, false, options);

            expect(prompt).toEqual({
                when: expect.any(Function),
                name: promptNames.title,
                type: 'input',
                guiOptions: {
                    mandatory: true,
                    breadcrumb: true
                },
                message: t('prompts.title'),
                default: 'Default Title',
                filter: expect.any(Function),
                validate: expect.any(Function)
            });
        });

        it('should execute the "when" function correctly', () => {
            const existingKeyRef = { value: true };

            const prompt = getTitlePrompt(existingKeyRef, false);
            const whenFn = prompt.when as (answers: { overwrite?: boolean }) => boolean;

            expect(whenFn({ overwrite: true })).toBe(true);
            expect(whenFn({ overwrite: false })).toBe(false);

            existingKeyRef.value = false;
            expect(whenFn({ overwrite: false })).toBe(true);
        });

        it('should trim the input value in the filter function', () => {
            const prompt = getTitlePrompt({ value: false }, false);
            const filterFn = prompt.filter as (val: string) => string;

            expect(filterFn('   Title Value   ')).toBe('Title Value');
            expect(filterFn('')).toBe('');
        });

        it('should validate the input value using validateText', () => {
            mockValidateText.mockReturnValue(true);

            const prompt = getTitlePrompt({ value: false }, false);
            const validateFn = prompt.validate as (val: string) => boolean;

            const result = validateFn('Valid Title');

            expect(mockValidateText).toHaveBeenCalledWith('Valid Title', 0);
            expect(result).toBe(true);
        });

        it('should fail validation if validateText returns false', () => {
            mockValidateText.mockReturnValue(false);

            const prompt = getTitlePrompt({ value: false }, false);
            const validateFn = prompt.validate as (val: string) => boolean;

            const result = validateFn('Invalid Title');

            expect(mockValidateText).toHaveBeenCalledWith('Invalid Title', 0);
            expect(result).toBe(false);
        });

        it('should set default to undefined if no options are provided', () => {
            const prompt = getTitlePrompt({ value: false }, false);

            expect(prompt.default).toBeUndefined();
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
                default: 'Default Subtitle',
                filter: expect.any(Function)
            });
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

            expect(prompt.default).toBeUndefined();
        });
    });
});

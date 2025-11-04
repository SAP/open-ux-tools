import { parseParameters } from '@sap-ux/adp-tooling';
import * as inputValidator from '@sap-ux/project-input-validator';
import { Severity } from '@sap-devx/yeoman-ui-types';

import {
    getInboundIdsPrompt,
    getParameterStringPrompt,
    getExistingFlpConfigInfoPrompt,
    getIconPrompt,
    getConfirmReplacePrompt
} from '../../../src/prompts/questions';
import { t } from '../../../src/i18n';
import { promptNames } from '../../../src';
import { add } from 'lodash';

const parseParametersMock = parseParameters as jest.Mock;

jest.mock('@sap-ux/adp-tooling', () => ({
    parseParameters: jest.fn()
}));

jest.mock('@sap-ux/project-input-validator', () => ({
    validateEmptyString: jest.fn()
}));

describe('advanced prompts', () => {
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
    describe('getInboundIdsPrompt', () => {
        it('should return a valid prompt object with inboundIds', () => {
            const prompt = getInboundIdsPrompt(inbounds);

            expect(prompt).toEqual({
                type: 'list',
                name: promptNames.inboundId,
                message: t('prompts.inboundIds'),
                choices: choices,
                default: expect.any(Function),
                validate: expect.any(Function),
                when: true,
                guiOptions: {
                    hint: t('tooltips.inboundId'),
                    breadcrumb: t('prompts.inboundIds'),
                    mandatory: true
                }
            });
        });

        it('should use the first inbound ID as the default value', () => {
            const prompt = getInboundIdsPrompt(inbounds);

            expect(prompt.default()).toBe(choices[0]?.value);
        });

        it('should validate using validateEmptyString', () => {
            const validateEmptyStringMock = jest.spyOn(inputValidator, 'validateEmptyString').mockReturnValue(true);
            const prompt = getInboundIdsPrompt(inbounds);
            (prompt.validate as Function)(inbounds['display-bank']);
            expect(validateEmptyStringMock).toHaveBeenCalledWith(inbounds['display-bank'].semanticObject);
            expect(validateEmptyStringMock).toHaveBeenCalledWith(inbounds['display-bank'].action);
        });
    });

    describe('getParameterStringPrompt', () => {
        const inboundIds: string[] = [];

        it('should return a valid parameter string prompt configuration', () => {
            const prompt = getParameterStringPrompt();

            expect(prompt).toEqual({
                type: 'editor',
                name: promptNames.additionalParameters,
                message: t('prompts.additionalParameters'),
                validate: expect.any(Function),
                default: expect.any(Function),
                guiOptions: {
                    hint: t('tooltips.additionalParameters'),
                    mandatory: false
                }
            });
        });

        it('should set the default value based on inboundId signature parameters', () => {
            const answers = {
                inboundId: {
                    signature: {
                        parameters: { key: 'value' }
                    }
                }
            };
            const prompt = getParameterStringPrompt();

            const defaultValue = prompt.default!(answers);
            expect(defaultValue).toBe(JSON.stringify(answers.inboundId.signature.parameters, null, 2));
        });

        it('should validate successfully when the input value is empty', () => {
            const prompt = getParameterStringPrompt();

            const result = prompt.validate!('');
            expect(result).toBe(true);
        });

        it('should validate successfully when parseParameters does not throw an error', () => {
            parseParametersMock.mockImplementation(() => undefined);

            const prompt = getParameterStringPrompt();

            const result = prompt.validate!('{"key": "value"}');
            expect(result).toBe(true);
        });

        it('should return an error message when parseParameters throws an error', () => {
            const errorMessage = 'Invalid JSON format';
            parseParametersMock.mockImplementation(() => {
                throw new Error(errorMessage);
            });

            const prompt = getParameterStringPrompt();

            const result = prompt.validate!('invalid json');
            expect(result).toBe(t('validators.invalidParameterString'));
        });
    });

    describe('getExistingFlpConfigInfoPrompt', () => {
        it('should return a valid prompt configuration for existing FLP config info', () => {
            const prompt = getExistingFlpConfigInfoPrompt(false);

            expect(prompt).toEqual({
                type: 'input',
                name: promptNames.existingFlpConfigInfo,
                message: t('prompts.existingFLPConfig'),
                when: expect.any(Function),
                guiOptions: {
                    type: 'label',
                    mandatory: false
                }
            });
        });

        it('should not show the prompt when isCLI is true', () => {
            const prompt = getExistingFlpConfigInfoPrompt(true);
            expect((prompt.when as Function)()).toBe(false);
        });
    });

    describe('getIconPrompt', () => {
        it('should return a valid icon prompt configuration', () => {
            const prompt = getIconPrompt();

            expect(prompt).toEqual({
                type: 'input',
                name: promptNames.icon,
                message: t('prompts.icon'),
                default: expect.any(Function),
                filter: expect.any(Function),
                guiOptions: {
                    breadcrumb: true
                }
            });
        });

        it('should set default value when passed with options', () => {
            const options = { default: 'sap-icon://home' };
            const prompt = getIconPrompt(options);

            expect(prompt.default()).toBe(options.default);
        });

        it('should set default value based on selected inbound', () => {
            const prompt = getIconPrompt();

            expect(prompt.default({ inboundId: { ...choices[0].value } })).toBe(choices[0].value.icon);
        });

        it('should trim value provided by user', () => {
            const prompt = getIconPrompt();
            const trimmedValue = (prompt.filter as Function)('  sap-icon://home  ');
            expect(trimmedValue).toBe('sap-icon://home');
        });
    });

    describe('getConfirmReplacePrompt', () => {
        it('should return a valid confirm replace prompt configuration', () => {
            const prompt = getConfirmReplacePrompt();

            expect(prompt).toEqual({
                type: 'confirm',
                name: promptNames.confirmReplace,
                message: t('prompts.confirmReplace'),
                default: false,
                validate: expect.any(Function),
                additionalMessages: expect.any(Function)
            });
        });

        it('should validate that the value is true', () => {
            const prompt = getConfirmReplacePrompt();

            expect((prompt.validate as Function)(true)).toBe(true);
            expect((prompt.validate as Function)(false)).toBe(' ');
        });

        it('should return the additional message with information severity', () => {
            const prompt = getConfirmReplacePrompt();
            const additionalMessage = (prompt.additionalMessages as Function)();

            expect(additionalMessage).toEqual({
                severity: Severity.information,
                message: t('additionalMessages.confirmReplaceAdditionalMessage')
            });
        });
    });
});

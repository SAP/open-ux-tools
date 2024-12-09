import { Severity } from '@sap-devx/yeoman-ui-types';

import { parseParameters } from '@sap-ux/adp-tooling';
import { validateEmptyString } from '@sap-ux/project-input-validator';

import {
    getCreateAnotherInboundPrompt,
    getEmptyInboundsLabelPrompt,
    getInboundIdsPrompt,
    getParameterStringPrompt
} from '../../../src/prompts/questions';
import { t } from '../../../src/i18n';
import { promptNames } from '../../../src';

const parseParametersMock = parseParameters as jest.Mock;

jest.mock('@sap-ux/adp-tooling', () => ({
    parseParameters: jest.fn()
}));

describe('advanced prompts', () => {
    describe('getInboundIdsPrompt', () => {
        const inboundIds = ['display-bank', 'new-upsert'];

        it('should return a valid prompt object with inboundIds', () => {
            const prompt = getInboundIdsPrompt(inboundIds);

            expect(prompt).toEqual({
                type: 'list',
                name: promptNames.inboundId,
                message: t('prompts.inboundIds'),
                choices: inboundIds,
                default: inboundIds[0],
                validate: validateEmptyString,
                when: true,
                guiOptions: {
                    hint: t('tooltips.inboundId'),
                    breadcrumb: t('prompts.inboundIds'),
                    mandatory: true
                }
            });
        });

        it('should set "when" to false when options.hide is true', () => {
            const prompt = getInboundIdsPrompt(inboundIds, { hide: true });

            expect(prompt.when).toBe(false);
        });

        it('should return a warning message when inboundIds are empty', () => {
            const emptyInboundIds: string[] = [];
            const prompt = getInboundIdsPrompt(emptyInboundIds);

            expect(prompt.when).toBe(false);
        });

        it('should use the first inbound ID as the default value', () => {
            const prompt = getInboundIdsPrompt(inboundIds);

            expect(prompt.default).toBe(inboundIds[0]);
        });

        it('should validate using validateEmptyString', () => {
            const prompt = getInboundIdsPrompt(inboundIds);

            expect(prompt.validate).toBe(validateEmptyString);
        });
    });

    describe('getEmptyInboundsLabelPrompt', () => {
        it('should return a label prompt when inboundIds is empty', () => {
            const inboundIds: string[] = [];
            const prompt = getEmptyInboundsLabelPrompt(inboundIds, 'app.variant1');

            expect(prompt).toEqual({
                type: 'input',
                name: promptNames.emptyInboundsInfo,
                message: t('prompts.emptyInboundsInfo'),
                guiOptions: {
                    type: 'label',
                    mandatory: false,
                    link: {
                        text: 'application page.',
                        url: `https://fioriappslibrary.hana.ondemand.com/sap/fix/externalViewer/index.html?appId=app.variant1&releaseGroupTextCombined=SC`
                    }
                },
                when: true
            });
        });

        it('should return a label prompt with a default URL when appId is not provided', () => {
            const inboundIds: string[] = [];
            const prompt = getEmptyInboundsLabelPrompt(inboundIds);

            expect(prompt).toEqual({
                type: 'input',
                name: promptNames.emptyInboundsInfo,
                message: t('prompts.emptyInboundsInfo'),
                guiOptions: {
                    type: 'label',
                    mandatory: false,
                    link: {
                        text: 'application page.',
                        url: `https://fioriappslibrary.hana.ondemand.com/sap/fix/externalViewer/#/home`
                    }
                },
                when: true
            });
        });

        it('should not display the prompt when inboundIds is not empty', () => {
            const inboundIds = ['display-bank', 'new-upsert'];
            const prompt = getEmptyInboundsLabelPrompt(inboundIds, 'app.variant1');

            expect(prompt.when).toBe(false);
        });

        it('should not display the prompt when options.hide is true', () => {
            const prompt = getEmptyInboundsLabelPrompt([], 'app.variant1', { hide: true });

            expect(prompt.when).toBe(false);
        });

        it('should generate the correct link URL based on appId', () => {
            const appId = 'app.variant1';
            const prompt = getEmptyInboundsLabelPrompt([], appId);

            expect(prompt.guiOptions?.link?.url).toBe(
                `https://fioriappslibrary.hana.ondemand.com/sap/fix/externalViewer/index.html?appId=app.variant1&releaseGroupTextCombined=SC`
            );
        });

        it('should generate the default link URL when appId is undefined', () => {
            const prompt = getEmptyInboundsLabelPrompt([]);

            expect(prompt.guiOptions?.link?.url).toBe(
                `https://fioriappslibrary.hana.ondemand.com/sap/fix/externalViewer/#/home`
            );
        });
    });

    describe('getParameterStringPrompt', () => {
        const inboundIds: string[] = [];

        it('should return a valid parameter string prompt configuration', () => {
            const prompt = getParameterStringPrompt(inboundIds);

            expect(prompt).toEqual({
                type: 'editor',
                name: promptNames.parameterString,
                message: t('prompts.parameterString'),
                validate: expect.any(Function),
                when: true,
                guiOptions: {
                    hint: t('tooltips.parameterString'),
                    mandatory: false
                }
            });
        });

        it('should set "when" to false if options.hide is true', () => {
            const prompt = getParameterStringPrompt(inboundIds, { hide: true });

            expect(prompt.when).toBe(false);
        });

        it('should set "when" to true if inboundIds is empty', () => {
            const prompt = getParameterStringPrompt(inboundIds);

            expect(prompt.when).toBe(true);
        });

        it('should validate successfully when the input value is empty', () => {
            const prompt = getParameterStringPrompt(inboundIds);

            const result = prompt.validate!('');
            expect(result).toBe(true);
        });

        it('should validate successfully when parseParameters does not throw an error', () => {
            parseParametersMock.mockImplementation(() => undefined);

            const prompt = getParameterStringPrompt(inboundIds);

            const result = prompt.validate!('{"key": "value"}');
            expect(result).toBe(true);
            expect(parseParameters).toHaveBeenCalledWith('{"key": "value"}');
        });

        it('should return an error message when parseParameters throws an error', () => {
            const errorMessage = 'Invalid JSON format';
            parseParametersMock.mockImplementation(() => {
                throw new Error(errorMessage);
            });

            const inboundIds: string[] = [];
            const prompt = getParameterStringPrompt(inboundIds);

            const result = prompt.validate!('invalid json');
            expect(result).toBe(errorMessage);
            expect(parseParameters).toHaveBeenCalledWith('invalid json');
        });
    });

    describe('getCreateAnotherInboundPrompt', () => {
        it('should return a valid prompt configuration for non-CLI environments', () => {
            const prompt = getCreateAnotherInboundPrompt(false);

            expect(prompt).toEqual({
                type: 'confirm',
                name: promptNames.createAnotherInbound,
                message: t('prompts.createAnotherInbound'),
                default: false,
                when: expect.any(Function),
                guiOptions: {
                    hint: t('tooltips.inboundId'),
                    breadcrumb: t('prompts.inboundIds')
                }
            });
        });

        it('should set "when" to false if options.hide is true', () => {
            const prompt = getCreateAnotherInboundPrompt(false, { hide: true });

            expect(prompt.when).toBe(false);
        });

        it('should set "when" to a function if options.hide is not true', () => {
            const prompt = getCreateAnotherInboundPrompt(false);

            expect(typeof prompt.when).toBe('function');
        });

        it('should evaluate "when" to true if platform is not CLI and inboundId is present', () => {
            const answers = { inboundId: 'testInboundId' };
            const prompt = getCreateAnotherInboundPrompt(false);

            expect((prompt.when as Function)(answers)).toBe(true);
        });

        it('should evaluate "when" to false if platform is CLI', () => {
            const answers = { inboundId: 'testInboundId' };
            const prompt = getCreateAnotherInboundPrompt(true);

            expect((prompt.when as Function)(answers)).toBe(false);
        });

        it('should evaluate "when" to false if no inboundId is provided', () => {
            const answers = {};
            const prompt = getCreateAnotherInboundPrompt(false);

            expect((prompt.when as Function)(answers)).toBe(false);
        });
    });
});

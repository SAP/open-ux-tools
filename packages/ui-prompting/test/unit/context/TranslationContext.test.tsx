import * as React from 'react';
import { render } from '@testing-library/react';
import { TranslationInput } from '../../../src/components';
import type { TranslationInputProps } from '../../../src/components';
import { TranslationProvider } from '../../../src/context/TranslationContext';
import type { TranslationProviderProps } from '../../../src/context/TranslationContext';
import { acceptI18nCallout, clickI18nButton, isI18nLoading } from '../utils';
import { TRANSLATE_EVENT_SHOW, TRANSLATE_EVENT_UPDATE } from '../../../src/types';
import { SapShortTextType } from '@sap-ux/i18n';

const id = 'test';
const annotationProps = {
    type: SapShortTextType.GeneralText,
    annotation: 'Dummy text'
};
const props: TranslationInputProps = {
    id,
    value: 'dummy',
    name: 'testInput',
    onChange: jest.fn(),
    guiOptions: {
        mandatory: undefined,
        hint: '',
        placeholder: undefined
    },
    errorMessage: undefined,
    properties: annotationProps
};

describe('TranslationProvider', () => {
    let translationProps: TranslationProviderProps;
    beforeEach(() => {
        translationProps = {
            bundle: { test: [{ key: { value: 'test' }, value: { value: 'Test value' } }] },
            onEvent: jest.fn(),
            pendingQuestions: []
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('Render translation input without value - trigger i18n entry creation', () => {
        render(
            <TranslationProvider {...translationProps}>
                <TranslationInput {...props} value="dummy value" />
            </TranslationProvider>
        );
        clickI18nButton();

        acceptI18nCallout(id);
        expect(translationProps.onEvent).toBeCalledTimes(1);
        expect(translationProps.onEvent).toBeCalledWith('testInput', {
            entry: { key: { value: 'dummyValue' }, value: { value: 'dummy value' } },
            name: TRANSLATE_EVENT_UPDATE,
            properties: annotationProps
        });
    });

    it('Render translation input with matching entry - trigger show', () => {
        render(
            <TranslationProvider {...translationProps}>
                <TranslationInput {...props} value="{i18n>test}" />
            </TranslationProvider>
        );
        expect(isI18nLoading()).toEqual(false);
        clickI18nButton(false);

        expect(translationProps.onEvent).toBeCalledTimes(1);
        expect(translationProps.onEvent).toBeCalledWith('testInput', {
            entry: { key: { value: 'test' }, value: { value: 'Test value' } },
            name: TRANSLATE_EVENT_SHOW
        });
    });

    it('Mark translation field busy', () => {
        render(
            <TranslationProvider {...translationProps} pendingQuestions={['testInput']}>
                <TranslationInput {...props} value="{i18n>test}" />
            </TranslationProvider>
        );
        expect(isI18nLoading()).toEqual(true);
    });
});

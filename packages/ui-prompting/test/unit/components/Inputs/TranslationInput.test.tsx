import { jest } from '@jest/globals';
import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { initIcons } from '@sap-ux/ui-components';
import type { TranslationInputProps } from '../../../../src/components';
import { SapShortTextType } from '@sap-ux/i18n';
import { TRANSLATE_EVENT_SHOW, TRANSLATE_EVENT_UPDATE } from '../../../../src/types';

const mockUseTranslation = jest.fn();

jest.unstable_mockModule('../../../../src/context/TranslationContext', () => ({
    useTranslation: mockUseTranslation,
    TranslationProvider: ({ children }: any) => children
}));

const { TranslationInput } = await import('../../../../src/components');
const { acceptI18nCallout, clickI18nButton, isI18nLoading } = await import('../../utils');

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

const selectors = {
    input: '.ms-TextField',
    button: '.ms-Button'
};

describe('TranslationInput', () => {
    initIcons();

    let triggerEventMock: jest.Mock;
    beforeEach(() => {
        triggerEventMock = jest.fn();
        mockUseTranslation.mockReturnValue({
            bundle: {
                test: [{ key: { value: 'test' }, value: { value: 'Test value' } }]
            },
            pendingQuestions: [],
            onEvent: triggerEventMock
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('Render translation input without value', () => {
        const { container } = render(<TranslationInput {...props} value="" />);
        expect(container.querySelectorAll(selectors.input).length).toEqual(1);
        expect(container.querySelectorAll(selectors.button).length).toEqual(0);
        expect(isI18nLoading()).toEqual(false);
    });

    it('Render translation input with value', () => {
        const { container } = render(<TranslationInput {...props} value="testValue" />);
        expect(screen.getByDisplayValue('testValue')).toBeDefined();
        expect(container.querySelectorAll(selectors.input).length).toEqual(1);
        expect(container.querySelectorAll(selectors.button).length).toEqual(1);
    });

    it('Render without guiOptions', () => {
        const { container } = render(<TranslationInput {...props} value="testValue" guiOptions={undefined} />);
        expect(container.querySelectorAll(selectors.input).length).toEqual(1);
        expect(container.querySelectorAll(selectors.button).length).toEqual(1);
    });

    it('Test property "id"', async () => {
        render(<TranslationInput {...props} id="test-id" />);
        expect(document.getElementById('test-id')).not.toBeNull();
    });

    it('Test without "id"', async () => {
        const { container } = render(<TranslationInput {...props} id={undefined} value="testValue" />);
        expect(container.querySelectorAll(selectors.input).length).toEqual(1);
        expect(container.querySelectorAll(selectors.button).length).toEqual(1);
    });

    it('Test property "message" as label', async () => {
        const label = 'Dummy label';
        render(<TranslationInput {...props} message={label} />);
        const element = screen.getByLabelText(label);
        expect(element).toBeDefined();
    });

    it('Test property "onChange"', () => {
        const onChangeFn = jest.fn();
        render(<TranslationInput {...props} onChange={onChangeFn} />);
        const input = screen.getByRole('textbox');
        expect(input).toBeDefined();
        fireEvent.change(input, { target: { value: 'new value' } });
        expect(onChangeFn).toHaveBeenCalled();
        expect(onChangeFn).toHaveBeenLastCalledWith('testInput', 'new value');
    });

    it('Test property "required"', () => {
        render(
            <TranslationInput
                {...props}
                guiOptions={{
                    mandatory: true
                }}
            />
        );
        expect(document.getElementsByClassName('is-required')).toBeDefined();
    });

    it('Test property "description"', () => {
        render(
            <TranslationInput
                {...props}
                guiOptions={{
                    hint: 'testInfo'
                }}
            />
        );
        expect(screen.getByTitle('testInfo')).toBeDefined();
    });

    it('Test property "errorMessage"', () => {
        render(<TranslationInput {...props} errorMessage="testErrorMessage" />);
        expect(screen.getByRole('alert')).toBeDefined();
    });

    it('Test property "placeholder"', () => {
        render(
            <TranslationInput
                {...props}
                guiOptions={{
                    placeholder: 'testPlaceholder'
                }}
            />
        );
        expect(screen.getByPlaceholderText('testPlaceholder')).toBeDefined();
    });

    it('I18n entry does not exist - trigger i18n creation', () => {
        render(<TranslationInput {...props} />);
        clickI18nButton();

        acceptI18nCallout(id);
        expect(triggerEventMock).toHaveBeenCalledTimes(1);
        expect(triggerEventMock).toHaveBeenCalledWith('testInput', {
            entry: { key: { value: 'dummy' }, value: { value: 'dummy' } },
            name: TRANSLATE_EVENT_UPDATE,
            properties: annotationProps
        });
    });

    it('I18n entry exists - trigger show', () => {
        render(<TranslationInput {...props} value="{i18n>test}" />);
        clickI18nButton(false);

        expect(triggerEventMock).toHaveBeenCalledTimes(1);
        expect(triggerEventMock).toHaveBeenCalledWith('testInput', {
            entry: { key: { value: 'test' }, value: { value: 'Test value' } },
            name: TRANSLATE_EVENT_SHOW
        });
    });

    it('Mark translation field busy', () => {
        mockUseTranslation.mockReturnValue({
            bundle: {},
            pendingQuestions: ['testInput'],
            onEvent: triggerEventMock
        });

        render(<TranslationInput {...props} value="{i18n>test}" />);
        expect(isI18nLoading()).toEqual(true);
    });
});

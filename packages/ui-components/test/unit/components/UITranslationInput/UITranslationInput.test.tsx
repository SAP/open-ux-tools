import * as React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { UiIcons, initIcons } from '../../../../src/components';
import type { UITranslationInputProps } from '../../../../src/components/UITranslationInput';
import { UITranslationInput, TranslationTextPattern } from '../../../../src/components/UITranslationInput';
import { getBundle, acceptCallout, SELECTORS } from './utils';

describe('<UITranslationInput />', () => {
    initIcons();

    const id = 'test';
    const entries = getBundle();

    const selectors = {
        input: '.ms-TextField',
        button: '.ms-Button',
        callout: '.ms-Callout'
    };

    const openCallout = () => {
        const openBtn = document.querySelector(selectors.button) as HTMLElement;
        fireEvent.click(openBtn);
        expect(document.querySelectorAll(selectors.callout).length).toEqual(1);
    };

    test('Render', () => {
        const { container } = render(
            <UITranslationInput
                id={'test'}
                entries={entries}
                allowedPatterns={[TranslationTextPattern.SingleBracketBinding]}
                defaultPattern={TranslationTextPattern.SingleBracketBinding}
                i18nPrefix={''}
            />
        );
        expect(container.querySelectorAll(selectors.input).length).toEqual(1);
        expect(container.querySelectorAll(selectors.button).length).toEqual(1);
    });

    test('Handle', () => {
        const onCreateNewEntryMock = jest.fn();
        const { container } = render(
            <UITranslationInput
                id={'test'}
                entries={entries}
                allowedPatterns={[TranslationTextPattern.SingleBracketBinding]}
                defaultPattern={TranslationTextPattern.SingleBracketBinding}
                i18nPrefix={''}
                onCreateNewEntry={onCreateNewEntryMock}
                value={'new entry'}
            />
        );

        openCallout();
        acceptCallout(id);
        // Check if callout closed
        expect(container.querySelectorAll(selectors.callout).length).toEqual(0);
        // Check if callbacks executed
        expect(onCreateNewEntryMock).toBeCalledTimes(1);
    });
});

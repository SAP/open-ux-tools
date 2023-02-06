import { fireEvent } from '@testing-library/react';
import type { I18nBundle } from '../../../../src/components/UITranslationInput/UITranslationButton.types';

const defaultEntries = ['dummy', 'Dummy', 'dummy1', 'Dummy1', 'test', 'Test'];
export const getBundle = (entries = defaultEntries): I18nBundle => {
    const bundle: I18nBundle = {};
    for (const entry of entries) {
        bundle[entry] = [
            {
                key: {
                    value: entry
                },
                value: {
                    value: entry
                }
            }
        ];
    }
    return bundle;
};

export const SELECTORS = {
    input: '.ms-TextField',
    button: '.ms-Button',
    callout: '.ms-Callout'
};

export const acceptCallout = (id: string): void => {
    const acceptBtn = document.querySelector(`#${id}-i18n-button-action-confirm`) as HTMLElement;
    fireEvent.click(acceptBtn);
};

import { fireEvent } from '@testing-library/react';

export const translationInputSelectors = {
    input: '.ms-TextField',
    button: '.ms-Button',
    callout: '.ms-Callout',
    loader: '.ms-Spinner'
};

export const clickI18nButton = (expectCallout = true) => {
    const openBtn = document.querySelector(translationInputSelectors.button) as HTMLElement;
    fireEvent.click(openBtn);
    expect(document.querySelectorAll(translationInputSelectors.callout).length).toEqual(expectCallout ? 1 : 0);
};
export const acceptI18nCallout = (id: string): void => {
    const acceptBtn = document.querySelector(`#${id}-i18n-button-action-confirm`) as HTMLElement;
    fireEvent.click(acceptBtn);
};
export const isI18nLoading = (): boolean => {
    return !!document.querySelectorAll(translationInputSelectors.loader).length;
};

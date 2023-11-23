import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { render } from '../utils';
import { initI18n } from '../../../src/i18n';

import { ThemeSelectorCallout } from '../../../src/components/ThemeSelectorCallout';
import { mockResizeObserver } from '../../utils/utils';
import { initIcons } from '@sap-ux/ui-components';

beforeAll(() => {
    mockResizeObserver();
    initI18n();
    initIcons();
});

test('renders theme selector callout', () => {
    render(<ThemeSelectorCallout />);
    screen.getByRole('button').click();
    const themeCalloutContent = screen.getAllByRole('button');
    expect(themeCalloutContent).toHaveLength(4);
});

test('check selected theme', () => {
    localStorage.setItem('theme', 'light');
    render(<ThemeSelectorCallout />);
    screen.getByRole('button').click();
    const themeCalloutContent = screen.getAllByRole('button', { pressed: true });
    const pressedButton = themeCalloutContent.find((button) => button.getAttribute('aria-pressed') === 'true');
    expect(pressedButton?.getAttribute('id')).toStrictEqual('theme-light-rect');
});

test('change theme to light', () => {
    render(<ThemeSelectorCallout />);
    screen.getByRole('button').click();
    screen.getByTitle('Light').click();
    const themeCalloutContent = screen.getAllByRole('button', { pressed: true });
    const pressedButton = themeCalloutContent.find((button) => button.getAttribute('aria-pressed') === 'true');
    expect(pressedButton?.getAttribute('id')).toStrictEqual('theme-light-rect');
    expect(localStorage.getItem('theme')).toStrictEqual('light');
});

test.only('change theme to light and navigate via keyboard for dark to have focus', async () => {
    localStorage.setItem('theme', 'light');
    const rect = {
        top: 0,
        height: 10,
        width: 10,
        left: 0
    } as DOMRect;
    render(<ThemeSelectorCallout />);
    const button = screen.getByRole('button');
    button.click();
    jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => rect);
    const callout = screen.getByTestId('theme-selector-callout');
    callout.focus();
    await new Promise((resolve) => setTimeout(resolve, 1));
    callout.dispatchEvent(
        new KeyboardEvent('keydown', {
            key: 'ArrowRight',
            code: 'ArrowRight',
            charCode: 39,
            which: 39
        })
    );
    const darkButton = screen.getByTitle('Dark');
    expect(document.activeElement).toBe(darkButton);
});

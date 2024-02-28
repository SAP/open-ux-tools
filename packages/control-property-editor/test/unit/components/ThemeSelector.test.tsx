import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
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

const triggerKeyDown = (key: string, code: number) => {
    const element = document.activeElement as HTMLElement;
    fireEvent.keyDown(element, {
        key,
        code: key,
        keyCode: code,
        charCode: code,
        which: code
    });
};
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

test('change theme to light and navigate via keyboard for dark to have focus', async () => {
    localStorage.setItem('theme', 'light');
    // Use 'isVisible' property to make virtual nodes visible - 'isVisible' is used by fluent for testing purposes
    Object.defineProperty(HTMLElement.prototype, 'isVisible', {
        configurable: true,
        get: () => true
    });
    render(<ThemeSelectorCallout />);
    // Open callout
    const button = screen.getByRole('button');
    button.click();
    // Wait for callout open
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: any) => {
        cb(1);
        return 1;
    });
    await new Promise((resolve) => setTimeout(resolve, 1));
    // Check if default/selected child is focused
    const lightButton = screen.getByTitle('Light');
    expect(document.activeElement).toEqual(lightButton);
    // Use arrow left to focus previous
    triggerKeyDown('ArrowRight', 39);
    const darkButton = screen.getByTitle('Dark');
    expect(document.activeElement).toEqual(darkButton);
    // select focused theme
    expect(localStorage.getItem('theme')).toStrictEqual('light');
    triggerKeyDown('Enter', 13);
    expect(localStorage.getItem('theme')).toStrictEqual('dark');
});

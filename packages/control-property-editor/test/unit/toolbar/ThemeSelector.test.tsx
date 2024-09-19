import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { render } from '../utils';

import { ThemeSelectorCallout } from '../../../src/components/ThemeSelectorCallout';

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
    localStorage.setItem('com.sap.ux.control-property-editor.theme', '"light modern"');
    render(<ThemeSelectorCallout />);
    screen.getByRole('button').click();
    const themeCalloutContent = screen.getAllByRole('button', { pressed: true });
    const pressedButton = themeCalloutContent.find((button) => button.getAttribute('aria-pressed') === 'true');
    expect(pressedButton?.getAttribute('id')).toStrictEqual('theme-light-modern-rect');
});

test('change theme to light', () => {
    render(<ThemeSelectorCallout />);
    screen.getByRole('button').click();
    screen.getByTitle('Light').click();
    const themeCalloutContent = screen.getAllByRole('button', { pressed: true });
    const pressedButton = themeCalloutContent.find((button) => button.getAttribute('aria-pressed') === 'true');
    expect(pressedButton?.getAttribute('id')).toStrictEqual('theme-light-modern-rect');
    expect(localStorage.getItem('com.sap.ux.control-property-editor.theme')).toStrictEqual('"light modern"');
});

test('change theme to light and navigate via keyboard for dark to have focus', async () => {
    localStorage.setItem('com.sap.ux.control-property-editor.theme', '"light modern"');
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
    expect(localStorage.getItem('com.sap.ux.control-property-editor.theme')).toStrictEqual('"light modern"');
    triggerKeyDown('Enter', 13);
    expect(localStorage.getItem('com.sap.ux.control-property-editor.theme')).toStrictEqual('"dark modern"');
});

import React from 'react';
import { screen } from '@testing-library/react';

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

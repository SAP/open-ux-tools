import React from 'react';
import { screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { render } from '../utils';
import { initI18n } from '../../../src/i18n';

import { ModeSwitcher } from '../../../src/toolbar/ModeSwitcher';
import { mockResizeObserver } from '../../utils/utils';
import { initIcons } from '@sap-ux/ui-components';
import { appLoaded, setAppMode } from '@sap-ux-private/control-property-editor-common';
import { initialState } from '../../../src/slice';

beforeAll(() => {
    mockResizeObserver();
    initI18n();
    initIcons();
});

test('renders ModeSwitcher', () => {
    const { dispatch, store } = render(<ModeSwitcher />, { initialState });
    store.dispatch(appLoaded());
    dispatch.mockClear();

    expect(screen.getByText(/mode:/i)).toBeDefined();
    const themeCalloutContent = screen.getAllByRole('button');
    expect(themeCalloutContent).toHaveLength(2);

    expect(screen.getByText(/mode:/i)).toBeInTheDocument();
    const editBtn = screen.getByRole('button', { name: /edit/i });
    expect(editBtn).toBeInTheDocument();

    const liveBtn = screen.getByRole('button', { name: /live/i });
    expect(liveBtn).toBeInTheDocument();

    liveBtn.click();
    expect(dispatch).toBeCalledWith(setAppMode('navigation'));

    editBtn.click();
    expect(dispatch).toBeCalledWith(setAppMode('adaptation'));
});

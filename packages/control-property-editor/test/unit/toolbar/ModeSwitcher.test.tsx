import React from 'react';
import { screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { render } from '../utils';

import { ModeSwitcher } from '../../../src/toolbar/ModeSwitcher';
import { appLoaded, setAppMode } from '@sap-ux-private/control-property-editor-common';
import { initialState, setProjectScenario } from '../../../src/slice';

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

test('renders ModeSwitcher with changed button names for ADP', () => {
    const { dispatch, store } = render(<ModeSwitcher />, { initialState });
    store.dispatch(setProjectScenario('ADAPTATION_PROJECT'));
    store.dispatch(appLoaded());
    dispatch.mockClear();

    expect(screen.getByText(/mode:/i)).toBeDefined();
    const themeCalloutContent = screen.getAllByRole('button');
    expect(themeCalloutContent).toHaveLength(2);

    expect(screen.getByText(/mode:/i)).toBeInTheDocument();

    const uiAdaptationBtn = screen.getByRole('button', { name: /ui adaptation/i });
    expect(uiAdaptationBtn).toBeInTheDocument();

    const navigationBtn = screen.getByRole('button', { name: /navigation/i });
    expect(navigationBtn).toBeInTheDocument();

    navigationBtn.click();
    expect(dispatch).toBeCalledWith(setAppMode('navigation'));

    uiAdaptationBtn.click();
    expect(dispatch).toBeCalledWith(setAppMode('adaptation'));
});

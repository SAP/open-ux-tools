import React from 'react';
import { screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { render } from '../utils';
import { initI18n } from '../../../src/i18n';

import { UndoRedoSaveActions } from '../../../src/toolbar/UndoRedoSaveActions';
import { mockResizeObserver } from '../../utils/utils';
import { initIcons } from '@sap-ux/ui-components';
import {
    setUndoRedoEnablement,
    setSaveEnablement,
    appLoaded,
    redo,
    save,
    undo
} from '@sap-ux-private/control-property-editor-common';
import { initialState } from '../../../src/slice';

beforeAll(() => {
    mockResizeObserver();
    initI18n();
    initIcons();
});

test('renders UndoRedoSaveActions', () => {
    const { dispatch, store } = render(<UndoRedoSaveActions />, { initialState });

    // update state
    store.dispatch(setUndoRedoEnablement({ canRedo: true, canUndo: true }));
    store.dispatch(setSaveEnablement(true));
    store.dispatch(appLoaded());

    dispatch.mockClear();

    const themeCalloutContent = screen.getAllByRole('button');
    expect(themeCalloutContent).toHaveLength(3);

    const undoBtn = screen.getByRole('button', { name: /undo/i });
    expect(undoBtn).toBeInTheDocument();

    const redoBtn = screen.getByRole('button', { name: /redo/i });
    expect(redoBtn).toBeInTheDocument();

    const saveBtn = screen.getByRole('button', { name: /save/i });
    expect(saveBtn).toBeInTheDocument();

    undoBtn.click();
    expect(dispatch).toBeCalledWith(undo());

    redoBtn.click();
    expect(dispatch).toBeCalledWith(redo());

    saveBtn.click();
    expect(dispatch).toBeCalledWith(save());
});

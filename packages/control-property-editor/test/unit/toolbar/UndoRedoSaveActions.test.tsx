import React from 'react';
import { screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { render } from '../utils';

import { UndoRedoSaveActions } from '../../../src/toolbar/UndoRedoSaveActions';
import {
    setUndoRedoEnablement,
    setSaveEnablement,
    appLoaded,
    redo,
    save,
    undo,
    setApplicationRequiresReload,
    reloadApplication
} from '@sap-ux-private/control-property-editor-common';

test('renders UndoRedoSaveActions', () => {
    const { dispatch, store } = render(<UndoRedoSaveActions />);

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

describe('toolbar', () => {
    test('renders save and reload', () => {
        const { dispatch, store } = render(<UndoRedoSaveActions />);

        // update state
        store.dispatch(setUndoRedoEnablement({ canRedo: true, canUndo: true }));
        store.dispatch(setSaveEnablement(true));
        store.dispatch(setApplicationRequiresReload(true));
        store.dispatch(appLoaded());

        dispatch.mockClear();

        const saveBtn = screen.getByRole('button', { name: /save and reload/i });
        expect(saveBtn).toBeInTheDocument();

        saveBtn.click();
        expect(dispatch).toBeCalledWith(
            reloadApplication({
                save: true
            })
        );
    });
});

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';

import { ViewChanger } from '../../../../src/toolbar/ViewChanger';

import { render } from '../../utils';

describe('ViewChanger', () => {
    test('zoom in', () => {
        const { dispatch } = render(<ViewChanger />, {
            initialState: {
                scale: 0.5,
                fitPreview: false
            }
        });
        screen.getByTitle(/zoom in/i).click();

        expect(dispatch).toHaveBeenNthCalledWith(1, {
            payload: 0.6,
            type: 'app/change-preview-scale'
        });
        expect(dispatch).toHaveBeenNthCalledWith(2, {
            payload: 'fixed',
            type: 'app/change-preview-scale-mode'
        });
    });

    test('zoom in with max scale', () => {
        const { dispatch } = render(<ViewChanger />, {
            initialState: {
                scale: 1,
                fitPreview: false
            }
        });
        screen.getByTitle(/zoom in/i).click();

        expect(dispatch).toHaveBeenCalledTimes(0);
    });

    test('zoom in to max scale', () => {
        const { dispatch } = render(<ViewChanger />, {
            initialState: {
                scale: 0.95,
                fitPreview: false
            }
        });
        screen.getByTitle(/zoom in/i).click();

        expect(dispatch).toHaveBeenNthCalledWith(1, {
            payload: 1,
            type: 'app/change-preview-scale'
        });
        expect(dispatch).toHaveBeenNthCalledWith(2, {
            payload: 'fixed',
            type: 'app/change-preview-scale-mode'
        });
    });

    test('zoom out', () => {
        const { dispatch } = render(<ViewChanger />, {
            initialState: {
                scale: 1,
                fitPreview: false
            }
        });
        screen.getByTitle(/zoom out/i).click();

        expect(dispatch).toHaveBeenNthCalledWith(1, {
            payload: 0.9,
            type: 'app/change-preview-scale'
        });
        expect(dispatch).toHaveBeenNthCalledWith(2, {
            payload: 'fixed',
            type: 'app/change-preview-scale-mode'
        });
    });

    test('zoom out with min scale', () => {
        const { dispatch } = render(<ViewChanger />, {
            initialState: {
                scale: 0.1,
                fitPreview: false
            }
        });
        screen.getByTitle(/zoom out/i).click();

        expect(dispatch).toHaveBeenCalledTimes(0);
    });

    test('zoom out with min scale', () => {
        const { dispatch } = render(<ViewChanger />, {
            initialState: {
                scale: 0.12,
                fitPreview: false
            }
        });
        screen.getByTitle(/zoom out/i).click();

        expect(dispatch).toHaveBeenNthCalledWith(1, {
            payload: 0.1,
            type: 'app/change-preview-scale'
        });
        expect(dispatch).toHaveBeenNthCalledWith(2, {
            payload: 'fixed',
            type: 'app/change-preview-scale-mode'
        });
    });

    test('select from dropdown', () => {
        const { dispatch } = render(<ViewChanger />, {
            initialState: {
                scale: 1,
                fitPreview: false
            }
        });
        const combobox = screen.getByRole('combobox');

        if (!combobox.parentElement) {
            expect(combobox.parentElement).not.toBeNull();
            return;
        }
        combobox.parentElement.querySelector('button')?.click();

        screen.getByText('50%').click();

        expect(dispatch).toHaveBeenNthCalledWith(1, {
            payload: 0.5,
            type: 'app/change-preview-scale'
        });
        expect(dispatch).toHaveBeenNthCalledWith(2, {
            payload: 'fixed',
            type: 'app/change-preview-scale-mode'
        });
    });

    test('select "fit" from dropdown', () => {
        const { dispatch } = render(<ViewChanger />, {
            initialState: {
                scale: 1,
                fitPreview: false
            }
        });
        const combobox = screen.getByRole('combobox');

        if (!combobox.parentElement) {
            expect(combobox.parentElement).not.toBeNull();
            return;
        }
        combobox.parentElement.querySelector('button')?.click();

        screen.getByText(/fit/i).click();

        expect(dispatch).toHaveBeenNthCalledWith(1, {
            payload: 'fit',
            type: 'app/change-preview-scale-mode'
        });
    });

    test('enter "new" value in combobox', () => {
        const { dispatch } = render(<ViewChanger />, {
            initialState: {
                scale: 1,
                fitPreview: true
            }
        });
        const combobox = screen.getByRole('combobox');

        if (!combobox.parentElement) {
            expect(combobox.parentElement).not.toBeNull();
            return;
        }
        const dropDownEditor = screen.getByTestId('testId-view-changer-combobox');
        const dropDownEditorInput = dropDownEditor.querySelector('input');
        if (dropDownEditorInput) {
            fireEvent.focus(dropDownEditorInput);
            fireEvent.input(dropDownEditorInput, { target: { value: '35%' } });
            fireEvent.blur(dropDownEditorInput);
        }

        expect(dispatch).toHaveBeenNthCalledWith(1, {
            payload: 0.35,
            type: 'app/change-preview-scale'
        });
    });
});

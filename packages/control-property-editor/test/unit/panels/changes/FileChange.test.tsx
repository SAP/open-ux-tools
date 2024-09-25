import { FileChange } from '../../../../src/panels/changes/FileChange';
import React from 'react';
import { screen } from '@testing-library/react';
import { render } from '../../utils';
import { useDispatch } from 'react-redux';
import { reloadApplication } from '@sap-ux-private/control-property-editor-common';

// Mock the useDispatch hook
jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    useDispatch: jest.fn().mockReturnValue(jest.fn())
}));

describe('FileChange', () => {
    it('renders the component with correct text when fileName is provided', () => {
        const hasUnsavedChanges = true;

        render(<FileChange hasUnsavedChanges={hasUnsavedChanges} />);

        const saveAndReloadLink = screen.getByText(/Save and Reload/i);
        expect(saveAndReloadLink).toBeInTheDocument();

        const detailLinkText = screen.getByText(/the app preview to show those changes\./i);
        expect(detailLinkText).toBeInTheDocument();

        saveAndReloadLink.click();
        const hookMock = useDispatch();
        expect(hookMock as jest.Mock).toHaveBeenCalledWith({
            payload: {
                save: true
            },
            type: reloadApplication.type
        });
    });

    it('renders the component with correct text when fileName is provided, when unsaved changes', () => {
        const hasUnsavedChanges = false;

        render(<FileChange hasUnsavedChanges={hasUnsavedChanges} />);

        const saveAndReloadLink = screen.getByText(/Reload/i);
        expect(saveAndReloadLink).toBeInTheDocument();

        const detailLinkText = screen.getByText(/the app preview to show those changes\./i);
        expect(detailLinkText).toBeInTheDocument();
    });
});

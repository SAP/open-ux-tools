import { FileChange } from '../../../../src/panels/changes/FileChange';
import React from 'react';
import { screen } from '@testing-library/react';
import { render } from '../../utils';
// Mock the useDispatch hook
jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    useDispatch: jest.fn()
}));

describe('FileChange', () => {
    it('renders the component with correct text when fileName is provided', () => {
        const fileName = 'exampleFile.txt';
        const hasUnsavedChanges = true;

        render(<FileChange fileName={fileName} hasUnsavedChanges={hasUnsavedChanges} />);

        const saveAndReloadLink = screen.getByText(/Save and Reload/i);
        expect(saveAndReloadLink).toBeInTheDocument();

        const detailLinkText = screen.getByText(/the editor to show those changes/i);
        expect(detailLinkText).toBeInTheDocument();
    });

    it('renders the component with correct text when fileName is provided, when unsaved changes', () => {
        const fileName = 'exampleFile.txt';
        const hasUnsavedChanges = false;

        render(<FileChange fileName={fileName} hasUnsavedChanges={hasUnsavedChanges} />);

        const saveAndReloadLink = screen.getByText(/Save/i);
        expect(saveAndReloadLink).toBeInTheDocument();

        const detailLinkText = screen.getByText(/the editor to show those changes/i);
        expect(detailLinkText).toBeInTheDocument();
    });
});

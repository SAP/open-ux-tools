import { FileChange } from '../../../../src/panels/changes/FileChange';
import React from 'react';
import { screen } from '@testing-library/react';
import { render } from '../../utils';
import { reloadApplication } from '@sap-ux-private/control-property-editor-common';

describe('FileChange', () => {
    it('renders the component with correct text when fileName is provided', () => {
        const hasUnsavedChanges = true;

        const { dispatch } = render(<FileChange hasUnsavedChanges={hasUnsavedChanges} />);

        const saveAndReloadLink = screen.getByText(/Save and Reload/i);
        expect(saveAndReloadLink).toBeInTheDocument();

        const detailLinkText = screen.getByText(/the app preview to show those changes\./i);
        expect(detailLinkText).toBeInTheDocument();

        saveAndReloadLink.click();
        expect(dispatch).toHaveBeenCalledWith({
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

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { jest } from '@jest/globals';

const mockUseSelector = jest.fn();

jest.unstable_mockModule('react-redux', () => ({
    useSelector: mockUseSelector
}));

jest.unstable_mockModule('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key })
}));

const { SystemHeader } = await import('../../../../../src/components/layout/header/SystemHeader');

describe('SystemHeader', () => {
    afterEach(() => {
        jest.resetAllMocks();
    });

    it('renders "newSapSystem" sub-heading when addNewSapSystem is true', () => {
        mockUseSelector.mockImplementation((selectorFn: any) =>
            selectorFn({ systemInfo: null, addNewSapSystem: true })
        );

        render(<SystemHeader />);
        expect(screen.getByText('titles.sapSystemDetails')).toBeInTheDocument();
        expect(screen.getByText('titles.newSapSystem')).toBeInTheDocument();
    });

    it('renders "onPremSystem" sub-heading when systemType is OnPrem', () => {
        mockUseSelector.mockImplementation((selectorFn: any) =>
            selectorFn({ systemInfo: { systemType: 'OnPrem' }, addNewSapSystem: false })
        );

        render(<SystemHeader />);
        expect(screen.getByText('titles.sapSystemDetails')).toBeInTheDocument();
        expect(screen.getByText('titles.onPremSystem')).toBeInTheDocument();
    });

    it('renders "btpSystem" sub-heading when systemType is AbapCloud', () => {
        mockUseSelector.mockImplementation((selectorFn: any) =>
            selectorFn({ systemInfo: { systemType: 'AbapCloud' }, addNewSapSystem: false })
        );

        render(<SystemHeader />);
        expect(screen.getByText('titles.sapSystemDetails')).toBeInTheDocument();
        expect(screen.getByText('titles.btpSystem')).toBeInTheDocument();
    });
});

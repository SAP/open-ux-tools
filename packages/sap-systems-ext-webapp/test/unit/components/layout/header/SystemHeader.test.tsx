import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { SystemHeader } from '../../../../../src/components/layout/header/SystemHeader';
import { useSelector } from 'react-redux';

// Mock useSelector and useTranslation
jest.mock('react-redux', () => ({
    useSelector: jest.fn()
}));

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key })
}));

describe('SystemHeader', () => {
    const mockUseSelector = useSelector as jest.Mock;

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

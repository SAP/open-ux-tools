import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
    UIFlexibleTableActionButton,
    UIFlexibleTableActionProps
} from '../../../src/components/UIFlexibleTable/UIFlexibleTableActionButton';
import { UiIcons } from '../../../src/components/Icons';

describe('<UIFlexibleTableActionButton />', () => {
    const defaultProps: UIFlexibleTableActionProps = {
        actionName: 'edit',
        className: 'custom-class',
        iconName: UiIcons.Edit,
        tableId: 'table-1',
        title: 'Edit',
        onClick: jest.fn(),
        onFocus: jest.fn(),
        disabled: false
    };

    it('renders with correct props', () => {
        const { getByRole } = render(<UIFlexibleTableActionButton {...defaultProps} />);
        const button = getByRole('button');
        expect(button).toHaveClass('flexible-table-actions-edit custom-class');
        expect(button).toHaveAttribute('title', 'Edit');
        expect(button).not.toBeDisabled();
    });

    it('calls onClick when clicked', () => {
        const onClick = jest.fn();
        const { getByRole } = render(<UIFlexibleTableActionButton {...defaultProps} onClick={onClick} />);
        fireEvent.click(getByRole('button'));
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('calls onFocus when focused', () => {
        const onFocus = jest.fn();
        const { getByRole } = render(<UIFlexibleTableActionButton {...defaultProps} onFocus={onFocus} />);
        fireEvent.focus(getByRole('button'));
        expect(onFocus).toHaveBeenCalledTimes(1);
    });

    it('renders as disabled', () => {
        const { getByRole } = render(<UIFlexibleTableActionButton {...defaultProps} disabled={true} />);
        expect(getByRole('button')).toBeDisabled();
    });

    it('renders without optional props', () => {
        const { getByRole } = render(
            <UIFlexibleTableActionButton actionName="delete" iconName={UiIcons.TrashCan} tableId="table-2" />
        );
        const button = getByRole('button');
        expect(button).toHaveClass('flexible-table-actions-delete');
        expect(button).not.toBeDisabled();
    });
});

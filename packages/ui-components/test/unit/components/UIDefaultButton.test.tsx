import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { DefaultButton } from '@fluentui/react';
import { UIDefaultButton } from '../../../src/components/UIButton/UIDefaultButton';
import type { UIDefaultButtonProps } from '../../../src/components/UIButton/UIDefaultButton';
import { UiIcons } from '../../../src/components/Icons';

describe('<UIDefaultButton />', () => {
    it('Should render a UIDefaultButton component', () => {
        const { container } = render(<UIDefaultButton>Dummy</UIDefaultButton>);
        expect(container.querySelector('.ms-Button')).toBeInTheDocument();
        expect(screen.getByText('Dummy')).toBeInTheDocument();
    });

    it('Styles - primary', () => {
        const { container } = render(<UIDefaultButton primary={true}>Dummy</UIDefaultButton>);
        const button = container.querySelector('.ms-Button');
        expect(button).toBeInTheDocument();
        expect(button).toHaveClass('ms-Button--primary');
    });

    it('Styles - primary and checked', () => {
        const { container } = render(
            <UIDefaultButton primary={true} checked={true}>
                Dummy
            </UIDefaultButton>
        );
        const button = container.querySelector('.ms-Button');
        expect(button).toBeInTheDocument();
        expect(button).toHaveClass('ms-Button--primary');
        expect(button).toHaveClass('is-checked');
    });

    it('Styles - secondary', () => {
        const { container } = render(<UIDefaultButton primary={false}>Dummy</UIDefaultButton>);
        const button = container.querySelector('.ms-Button');
        expect(button).toBeInTheDocument();
        expect(button).not.toHaveClass('ms-Button--primary');
    });

    it('Styles - secondary and checked', () => {
        const { container } = render(
            <UIDefaultButton primary={false} checked={true}>
                Dummy
            </UIDefaultButton>
        );
        const button = container.querySelector('.ms-Button');
        expect(button).toBeInTheDocument();
        expect(button).not.toHaveClass('ms-Button--primary');
        expect(button).toHaveClass('is-checked');
    });

    it('Styles - alert', () => {
        const { container } = render(<UIDefaultButton alert={true}>Dummy</UIDefaultButton>);
        const button = container.querySelector('.ms-Button');
        expect(button).toBeInTheDocument();
        // Alert styling is applied via styles prop, verify component renders
        expect(button).toHaveTextContent('Dummy');
    });

    it('Styles - alert and checked', () => {
        const { container } = render(
            <UIDefaultButton alert={true} checked={true}>
                Dummy
            </UIDefaultButton>
        );
        const button = container.querySelector('.ms-Button');
        expect(button).toBeInTheDocument();
        expect(button).toHaveClass('is-checked');
        expect(button).toHaveTextContent('Dummy');
    });

    it('Styles - transparent', () => {
        const { container } = render(<UIDefaultButton transparent={true}>Dummy</UIDefaultButton>);
        const button = container.querySelector('.ms-Button');
        expect(button).toBeInTheDocument();
        expect(screen.getByText('Dummy')).toBeInTheDocument();
    });

    it('Styles - transparent and checked', () => {
        const { container } = render(
            <UIDefaultButton transparent={true} checked={true}>
                Dummy
            </UIDefaultButton>
        );
        const button = container.querySelector('.ms-Button');
        expect(button).toBeInTheDocument();
        expect(button).toHaveClass('is-checked');
        expect(screen.getByText('Dummy')).toBeInTheDocument();
    });

    describe('Menu', () => {
        it('Default render without icon', () => {
            const { container } = render(<UIDefaultButton>Dummy</UIDefaultButton>);
            expect(container.querySelector('[data-icon-name="ArrowDown"]')).not.toBeInTheDocument();
        });

        it('Render without icon', () => {
            const { container } = render(<UIDefaultButton menuProps={undefined}>Dummy</UIDefaultButton>);
            expect(container.querySelector('[data-icon-name="ArrowDown"]')).not.toBeInTheDocument();
        });

        it('Render with default icon', () => {
            const { container } = render(<UIDefaultButton menuProps={{ items: [] }}>Dummy</UIDefaultButton>);
            expect(container.querySelector('[data-icon-name="ArrowDown"]')).toBeInTheDocument();
        });

        it('Render with custom icon', () => {
            const { container } = render(
                <UIDefaultButton menuIconProps={{ iconName: UiIcons.ArrowUp }}>Dummy</UIDefaultButton>
            );
            expect(container.querySelector('[data-icon-name="ArrowDown"]')).not.toBeInTheDocument();
            expect(container.querySelector('[data-icon-name="ArrowUp"]')).toBeInTheDocument();
        });
    });
});

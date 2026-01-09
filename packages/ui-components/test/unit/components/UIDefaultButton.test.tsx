import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { UIDefaultButton } from '../../../src/components/UIButton/UIDefaultButton';
import { UiIcons } from '../../../src/components/Icons';
import { compareStylesByElement, findStyleFromStyleSheets } from '../../utils/styles';

describe('<UIDefaultButton />', () => {
    const selectors = {
        button: '.ms-Button'
    };
    it('Should render a UIDefaultButton component', () => {
        const { container } = render(<UIDefaultButton>Dummy</UIDefaultButton>);
        expect(container.querySelector(selectors.button)).toBeInTheDocument();
        expect(screen.getByText('Dummy')).toBeInTheDocument();
    });

    it('Styles - primary', () => {
        const { container } = render(<UIDefaultButton primary={true}>Dummy</UIDefaultButton>);
        const button = container.querySelector(selectors.button);
        expect(button).toBeInTheDocument();
        expect(button).toHaveClass('ms-Button--primary');
        // Validate basic color styles
        compareStylesByElement(button, {
            backgroundColor: 'var(--vscode-button-background)',
            borderColor: 'var(--vscode-button-border, transparent)',
            color: 'var(--vscode-button-foreground)'
        });
        expect(findStyleFromStyleSheets('backgroundColor', button, `:hover`)).toEqual(
            'var(--vscode-button-hoverBackground)'
        );
    });

    it('Styles - primary and checked', () => {
        const { container } = render(
            <UIDefaultButton primary={true} checked={true}>
                Dummy
            </UIDefaultButton>
        );
        const button = container.querySelector(selectors.button);
        expect(button).toBeInTheDocument();
        expect(button).toHaveClass('ms-Button--primary');
        expect(button).toHaveClass('is-checked');
        // Validate basic color styles
        compareStylesByElement(button, {
            backgroundColor: 'var(--vscode-button-background)',
            borderColor: 'var(--vscode-contrastActiveBorder, var(--vscode-button-border, transparent))',
            color: 'var(--vscode-button-foreground)'
        });
        expect(findStyleFromStyleSheets('backgroundColor', button, `:hover`)).toEqual(
            'var(--vscode-button-hoverBackground)'
        );
    });

    it('Styles - secondary', () => {
        const { container } = render(<UIDefaultButton primary={false}>Dummy</UIDefaultButton>);
        const button = container.querySelector(selectors.button);
        expect(button).toBeInTheDocument();
        expect(button).not.toHaveClass('ms-Button--primary');
        // Validate basic color styles
        compareStylesByElement(button, {
            backgroundColor: 'var(--vscode-button-secondaryBackground)',
            borderColor: 'var(--vscode-button-border, transparent)',
            color: 'var(--vscode-button-secondaryForeground)'
        });
        expect(findStyleFromStyleSheets('backgroundColor', button, `:hover`)).toEqual(
            'var(--vscode-button-secondaryHoverBackground)'
        );
    });

    it('Styles - secondary and checked', () => {
        const { container } = render(
            <UIDefaultButton primary={false} checked={true}>
                Dummy
            </UIDefaultButton>
        );
        const button = container.querySelector(selectors.button);
        expect(button).toBeInTheDocument();
        expect(button).not.toHaveClass('ms-Button--primary');
        expect(button).toHaveClass('is-checked');
        // Validate basic color styles
        compareStylesByElement(button, {
            backgroundColor: 'var(--vscode-button-secondaryBackground)',
            borderColor: 'var(--vscode-contrastActiveBorder, var(--vscode-button-border, transparent))',
            color: 'var(--vscode-button-secondaryForeground)'
        });
        expect(findStyleFromStyleSheets('backgroundColor', button, `:hover`)).toEqual(
            'var(--vscode-button-secondaryHoverBackground)'
        );
    });

    it('Styles - alert', () => {
        const { container } = render(<UIDefaultButton alert={true}>Dummy</UIDefaultButton>);
        const button = container.querySelector(selectors.button);
        expect(button).toBeInTheDocument();

        // Validate alert styles are applied
        compareStylesByElement(button, {
            backgroundColor: 'var(--vscode-errorForeground)',
            borderColor: 'var(--vscode-button-border, transparent)',
            color: 'var(--vscode-button-foreground)'
        });
        expect(findStyleFromStyleSheets('backgroundColor', button, `:hover`)).toEqual(
            'var(--vscode-editorError-foreground)'
        );
    });

    it('Styles - alert and checked', () => {
        const { container } = render(
            <UIDefaultButton alert={true} checked={true}>
                Dummy
            </UIDefaultButton>
        );
        const button = container.querySelector(selectors.button);
        expect(button).toBeInTheDocument();
        expect(button).toHaveClass('is-checked');

        // Validate alert and checked styles are both applied
        // When checked=true, checkedBorderColor is used instead of alert borderColor
        compareStylesByElement(button, {
            backgroundColor: 'var(--vscode-errorForeground)',
            borderColor: 'var(--vscode-contrastActiveBorder, var(--vscode-button-border, transparent))',
            color: 'var(--vscode-button-foreground)'
        });
        expect(findStyleFromStyleSheets('backgroundColor', button, `:hover`)).toEqual(
            'var(--vscode-editorError-foreground)'
        );
    });

    it('Styles - transparent', () => {
        const { container } = render(<UIDefaultButton transparent={true}>Dummy</UIDefaultButton>);
        const button = container.querySelector(selectors.button);
        expect(button).toBeInTheDocument();
        expect(screen.getByText('Dummy')).toBeInTheDocument();
        // Validate basic color styles
        expect({
            backgroundColor: findStyleFromStyleSheets('backgroundColor', button),
            borderColor: findStyleFromStyleSheets('borderColor', button),
            color: findStyleFromStyleSheets('color', button),
            backgroundColorHover: findStyleFromStyleSheets('backgroundColor', button, `:hover`)
        }).toEqual({
            backgroundColor: 'transparent',
            backgroundColorHover: 'var(--vscode-toolbar-hoverBackground, var(--vscode-menubar-selectionBackground))',
            borderColor: 'transparent',
            color: 'var(--vscode-foreground)'
        });
    });

    it('Styles - transparent and checked', () => {
        const { container } = render(
            <UIDefaultButton transparent={true} checked={true}>
                Dummy
            </UIDefaultButton>
        );
        const button = container.querySelector(selectors.button);
        expect(button).toBeInTheDocument();
        expect(button).toHaveClass('is-checked');
        expect(screen.getByText('Dummy')).toBeInTheDocument();
        // Validate basic color styles
        expect({
            backgroundColor: findStyleFromStyleSheets('backgroundColor', button),
            borderColor: findStyleFromStyleSheets('borderColor', button),
            color: findStyleFromStyleSheets('color', button),
            backgroundColorHover: findStyleFromStyleSheets('backgroundColor', button, `:hover`)
        }).toEqual({
            backgroundColor: 'var(--vscode-button-background)',
            backgroundColorHover: 'var(--vscode-button-background)',
            borderColor: 'var(--vscode-contrastActiveBorder, var(--vscode-button-border, transparent))',
            color: 'var(--vscode-button-foreground)'
        });
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

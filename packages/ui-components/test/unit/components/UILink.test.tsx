import * as React from 'react';
import { render } from '@testing-library/react';
import type { ILinkStyles } from '@fluentui/react';
import { UILink } from '../../../src/components/UILink';
import type { UILinkProps } from '../../../src/components/UILink';
import { findStyleFromStyleSheets } from '../../utils/styles';

// Extract the linkStyles function from a UILink render() call.
// UILink is a class component that passes a `styles` function to FluentUI's Link.
// Accessing it this way avoids jest.unstable_mockModule and dynamic imports.
function getStyles(props: Partial<UILinkProps> = {}): ILinkStyles {
    const instance = new UILink(props as UILinkProps);
    const jsx = instance.render() as React.ReactElement;
    const stylesFn = jsx.props.styles as () => Partial<ILinkStyles>;
    return stylesFn() as ILinkStyles;
}

describe('<UILink />', () => {
    it('Should render a UILink component', () => {
        const { container } = render(<UILink>Dummy</UILink>);
        expect(container.querySelectorAll('.ms-Link')).toHaveLength(1);
    });

    describe('Styles - color via rendered DOM', () => {
        it('primary uses textLink foreground color', () => {
            render(<UILink>Dummy</UILink>);
            const el = document.body.querySelector('.ms-Link') as HTMLElement;
            expect(findStyleFromStyleSheets('color', el)).toEqual('var(--vscode-textLink-foreground)');
        });

        it('secondary uses foreground color', () => {
            render(<UILink secondary={true}>Dummy</UILink>);
            const el = document.body.querySelector('.ms-Link') as HTMLElement;
            expect(findStyleFromStyleSheets('color', el)).toEqual('var(--vscode-foreground)');
        });

        it('disabled applies opacity 0.4', () => {
            render(<UILink disabled={true}>Dummy</UILink>);
            const el = document.body.querySelector('.ms-Link') as HTMLElement;
            expect(window.getComputedStyle(el).opacity).toEqual('0.4');
        });
    });

    describe('Styles - textDecoration and selectors via getStyles', () => {
        it('primary has underline and hover selectors', () => {
            const styles = getStyles();
            const root = styles.root as Record<string, unknown>;
            expect(root.textDecoration).toEqual('underline');
            expect(root.selectors).toBeDefined();
        });

        it('underline=false removes textDecoration', () => {
            const styles = getStyles({ underline: false });
            const root = styles.root as Record<string, unknown>;
            expect(root.textDecoration).toBeUndefined();
        });

        it('disabled removes selectors (no hover/focus effects)', () => {
            const styles = getStyles({ disabled: true });
            const root = styles.root as Record<string, unknown>;
            expect(root.selectors).toBeUndefined();
        });

        it('secondary uses foreground color in hover selectors', () => {
            const styles = getStyles({ secondary: true });
            const root = styles.root as Record<string, unknown>;
            const hover = (root.selectors as Record<string, unknown>)?.[
                '&:hover, &:hover:focus, &:hover:active'
            ] as Record<string, unknown>;
            expect(hover?.color).toEqual('var(--vscode-foreground)');
        });
    });
});

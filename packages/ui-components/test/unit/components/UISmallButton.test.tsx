import * as React from 'react';
import { render } from '@testing-library/react';
import type { IButtonStyles } from '@fluentui/react';
import { UISmallButton } from '../../../src/components/UIButton/UISmallButton';
import { findStyleFromStyleSheets } from '../../utils/styles';

// getStyles is only needed for the focus pseudo-element selector which
// is not accessible via getComputedStyle or document.styleSheets in jsdom.
function getStyles(primary = false): IButtonStyles {
    const instance = new UISmallButton({ primary });
    return (instance as unknown as { setStyle: (p: { primary?: boolean }) => IButtonStyles }).setStyle({ primary });
}

describe('<UISmallButton />', () => {
    it('Should render a UISmallButton component', () => {
        const { container } = render(<UISmallButton>Dummy</UISmallButton>);
        expect(container.querySelectorAll('.ms-Button')).toHaveLength(1);
    });

    describe('Styles - via rendered DOM', () => {
        it('secondary - height and fontSize', () => {
            render(<UISmallButton>Dummy</UISmallButton>);
            const el = document.body.querySelector('.ms-Button') as HTMLElement;
            expect(window.getComputedStyle(el).height).toEqual('16px');
            expect(window.getComputedStyle(el).fontSize).toEqual('11px');
        });

        it('secondary - background and color', () => {
            render(<UISmallButton>Dummy</UISmallButton>);
            const el = document.body.querySelector('.ms-Button') as HTMLElement;
            expect(findStyleFromStyleSheets('backgroundColor', el)).toEqual(
                'var(--vscode-button-secondaryBackground, #5f6a79)'
            );
            expect(findStyleFromStyleSheets('color', el)).toEqual(
                'var(--vscode-button-secondaryForeground, #ffffff)'
            );
        });

        it('primary - background and color', () => {
            render(<UISmallButton primary={true}>Dummy</UISmallButton>);
            const el = document.body.querySelector('.ms-Button') as HTMLElement;
            expect(findStyleFromStyleSheets('backgroundColor', el)).toEqual('var(--vscode-button-background)');
            expect(findStyleFromStyleSheets('color', el)).toEqual('var(--vscode-button-foreground)');
        });
    });

    describe('Styles - focus selector (pseudo-element, via getStyles)', () => {
        it('has focus :focus:after outline selector', () => {
            const styles = getStyles();
            const selectors = (styles.root as Record<string, unknown>).selectors as Record<string, unknown>;
            expect(selectors['.ms-Fabric--isFocusVisible &:focus:after']).toBeDefined();
        });
    });
});

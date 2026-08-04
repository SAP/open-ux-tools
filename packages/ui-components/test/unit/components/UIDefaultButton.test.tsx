import * as React from 'react';
import { render } from '@testing-library/react';
import { UIDefaultButton, BASE_STYLES } from '../../../src/components/UIButton/UIDefaultButton';
import type { UIDefaultButtonProps } from '../../../src/components/UIButton/UIDefaultButton';
import type { IButtonStyles } from '@fluentui/react';
import { UiIcons } from '../../../src/components/Icons';
import { initIcons } from '../../../src/components';
import { findStyleFromStyleSheets } from '../../utils/styles';

// getStyles is needed for pseudo-state style objects (rootHovered, rootDisabled,
// rootChecked, rootCheckedHovered) which are not observable from the DOM in jsdom.
function getStyles(props: UIDefaultButtonProps): IButtonStyles {
    const instance = new UIDefaultButton(props) as unknown as {
        setStyle(p: UIDefaultButtonProps): IButtonStyles;
    };
    return instance.setStyle(props);
}

describe('<UIDefaultButton />', () => {
    it('Should render a UIDefaultButton component', () => {
        const { container } = render(<UIDefaultButton>Dummy</UIDefaultButton>);
        expect(container.querySelectorAll('.ms-Button')).toHaveLength(1);
    });

    describe('Styles - root backgroundColor via rendered DOM', () => {
        it('secondary (default)', () => {
            render(<UIDefaultButton>Dummy</UIDefaultButton>);
            const el = document.body.querySelector('.ms-Button') as HTMLElement;
            expect(findStyleFromStyleSheets('backgroundColor', el)).toEqual(BASE_STYLES.secondary.backgroundColor);
        });

        it('primary', () => {
            render(<UIDefaultButton primary={true}>Dummy</UIDefaultButton>);
            const el = document.body.querySelector('.ms-Button') as HTMLElement;
            expect(findStyleFromStyleSheets('backgroundColor', el)).toEqual(BASE_STYLES.primary.backgroundColor);
        });

        it('alert', () => {
            render(<UIDefaultButton alert={true}>Dummy</UIDefaultButton>);
            const el = document.body.querySelector('.ms-Button') as HTMLElement;
            expect(findStyleFromStyleSheets('backgroundColor', el)).toEqual(BASE_STYLES.alert.backgroundColor);
        });

        it('transparent', () => {
            render(<UIDefaultButton transparent={true}>Dummy</UIDefaultButton>);
            const el = document.body.querySelector('.ms-Button') as HTMLElement;
            expect(findStyleFromStyleSheets('backgroundColor', el)).toEqual(BASE_STYLES.transparent.backgroundColor);
        });
    });

    describe('Styles - pseudo-states via getStyles', () => {
        describe.each([
            { label: 'primary', props: { primary: true } },
            { label: 'secondary', props: { primary: false } },
            { label: 'alert', props: { alert: true } },
            { label: 'transparent', props: { transparent: true } }
        ])('$label', ({ props }) => {
            it('rootDisabled has opacity 0.5', () => {
                const styles = getStyles(props);
                expect((styles.rootDisabled as Record<string, unknown>)?.opacity).toEqual('0.5 !important');
            });

            it('rootHovered has different background from default', () => {
                const styles = getStyles(props);
                const defaultBg = (styles.root as Record<string, unknown>)?.backgroundColor;
                const hoveredBg = (styles.rootHovered as Record<string, unknown>)?.backgroundColor;
                expect(hoveredBg).toBeDefined();
                expect(hoveredBg).not.toEqual(defaultBg);
            });

            it('root has focus selector', () => {
                const styles = getStyles(props);
                const selectors = ((styles.root as Record<string, unknown>)?.selectors ?? {}) as Record<
                    string,
                    unknown
                >;
                expect(selectors['.ms-Fabric--isFocusVisible &:focus:after']).toBeDefined();
            });
        });

        it('checked - rootChecked borderColor uses contrastActiveBorder', () => {
            const styles = getStyles({ primary: true, checked: true });
            expect((styles.rootChecked as Record<string, unknown>)?.borderColor).toEqual(
                BASE_STYLES.checkedBorderColor
            );
        });

        it('transparent checked - rootChecked uses primary background', () => {
            const styles = getStyles({ transparent: true, checked: true });
            expect((styles.rootChecked as Record<string, unknown>)?.backgroundColor).toEqual(
                BASE_STYLES.transparent.checkedBackgroundColor
            );
        });
    });

    describe('Menu', () => {
        beforeAll(() => {
            initIcons();
        });

        it('Default render without icon', () => {
            const { container } = render(<UIDefaultButton>Dummy</UIDefaultButton>);
            expect(container.querySelectorAll('[data-icon-name="ArrowDown"]')).toHaveLength(0);
        });

        it('Render without icon', () => {
            const { container } = render(<UIDefaultButton menuProps={undefined}>Dummy</UIDefaultButton>);
            expect(container.querySelectorAll('[data-icon-name="ArrowDown"]')).toHaveLength(0);
        });

        it('Render with default icon', () => {
            const { container } = render(<UIDefaultButton menuProps={{ items: [] }}>Dummy</UIDefaultButton>);
            expect(container.querySelectorAll('[data-icon-name="ArrowDown"]')).toHaveLength(1);
        });

        it('Render with custom icon', () => {
            const { container } = render(
                <UIDefaultButton menuIconProps={{ iconName: UiIcons.ArrowUp }}>Dummy</UIDefaultButton>
            );
            expect(container.querySelectorAll('[data-icon-name="ArrowDown"]')).toHaveLength(0);
            expect(container.querySelectorAll('[data-icon-name="ArrowUp"]')).toHaveLength(1);
        });
    });
});

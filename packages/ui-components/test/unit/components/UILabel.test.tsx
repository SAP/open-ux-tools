import * as React from 'react';
import { render } from '@testing-library/react';
import { labelGlobalStyle, UILabel } from '../../../src/components/UILabel';
import type { ILabelStyleProps, ILabelStyles } from '@fluentui/react';
import { findStyleFromStyleSheets } from '../../utils/styles';

// getStyles is only needed for the required ::after pseudo-element assertion,
// which is not accessible via getComputedStyle or document.styleSheets in jsdom.
function getStylesFn(): (props: ILabelStyleProps) => Partial<ILabelStyles> {
    const instance = new UILabel({});
    const jsx = instance.render() as React.ReactElement;
    return jsx.props.styles;
}

describe('<UILabel />', () => {
    it('Should render a UILabel component', () => {
        const { container } = render(<UILabel>Dummy</UILabel>);
        expect(container.querySelectorAll('.ms-Label')).toHaveLength(1);
    });

    describe('Styles', () => {
        it('default - label global styles applied', () => {
            const styles = getStylesFn()({} as ILabelStyleProps) as ILabelStyles;
            const root = styles.root as Array<unknown>;
            expect(root[0]).toEqual({ marginTop: 25, ...labelGlobalStyle });
        });

        it('disabled - opacity 0.4 applied to rendered label', () => {
            render(<UILabel disabled>Dummy</UILabel>);
            const el = document.body.querySelector('label.ms-Label') as HTMLElement;
            expect(window.getComputedStyle(el).opacity).toEqual('0.4');
        });

        it('required - ::after indicator (pseudo-element, via getStyles)', () => {
            const styles = getStylesFn()({ required: true } as ILabelStyleProps) as ILabelStyles;
            const root = styles.root as Array<unknown>;
            expect((root[2] as Record<string, unknown>)?.selectors).toMatchObject({
                '::after': { color: 'var(--vscode-inputValidation-errorBorder)' }
            });
        });
    });
});

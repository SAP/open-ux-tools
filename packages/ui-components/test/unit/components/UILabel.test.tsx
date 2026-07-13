import * as React from 'react';
import { render } from '@testing-library/react';
import type { ILabelStyleProps, ILabelStyles } from '@fluentui/react';
import { labelGlobalStyle, UILabel } from '../../../src/components/UILabel';

describe('<UILabel />', () => {
    it('Should render a UIToggle component', () => {
        const { container } = render(<UILabel>Dummy</UILabel>);
        expect(container.querySelectorAll('.ms-Label').length).toEqual(1);
    });

    it('Styles', () => {
        const labelStyles = (props: ILabelStyleProps): Partial<ILabelStyles> => ({
            root: [
                {
                    marginTop: 25,
                    ...labelGlobalStyle
                },
                props.disabled && {
                    opacity: '0.4'
                },
                props.required && {
                    selectors: {
                        '::after': {
                            content: "' *' / ''",
                            color: 'var(--vscode-inputValidation-errorBorder)',
                            paddingRight: 12
                        }
                    }
                }
            ]
        });

        const styles = labelStyles({} as ILabelStyleProps) as ILabelStyles;
        expect(styles.root).toMatchInlineSnapshot(
            {},
            `
            Array [
              Object {
                "color": "var(--vscode-input-foreground)",
                "fontSize": "13px",
                "fontWeight": "bold",
                "marginTop": 25,
                "padding": "4px 0",
              },
              undefined,
              undefined,
            ]
        `
        );
    });
});

import * as React from 'react';
import { render } from '@testing-library/react';
import type { IButtonProps, IButtonStyles } from '@fluentui/react';
import { UISmallButton } from '../../../src/components/UIButton/UISmallButton';

class UISmallButtonTestHelper extends UISmallButton {
    public callSetStyle(props: IButtonProps): IButtonStyles {
        return this.setStyle(props);
    }
}

describe('<UISmallButton />', () => {
    it('Should render a UISmallButton component', () => {
        const { container } = render(<UISmallButton>Dummy</UISmallButton>);
        expect(container.querySelector('.ms-Button')).toBeInTheDocument();
    });

    it('Styles - primary', () => {
        const helper = new UISmallButtonTestHelper({ children: 'Dummy' });
        const styles = helper.callSetStyle({ primary: true });
        expect(styles.root).toMatchInlineSnapshot(`
            Object {
              "backgroundColor": "var(--vscode-button-background)",
              "borderColor": "var(--vscode-contrastBorder, var(--vscode-button-background))",
              "borderRadius": 20,
              "color": "var(--vscode-button-foreground)",
              "fontSize": "11px",
              "fontWeight": 400,
              "height": 16,
              "minWidth": "initial",
              "paddingLeft": 13,
              "paddingRight": 13,
              "selectors": Object {
                ".ms-Fabric--isFocusVisible &:focus:after": Object {
                  "inset": -3,
                  "outlineColor": "var(--vscode-focusBorder)",
                },
              },
            }
        `);
    });

    it('Styles - secondary', () => {
        const helper = new UISmallButtonTestHelper({ children: 'Dummy' });
        const styles = helper.callSetStyle({ primary: false });
        expect(styles.root).toMatchInlineSnapshot(`
            Object {
              "backgroundColor": "var(--vscode-button-secondaryBackground, #5f6a79)",
              "borderColor": "var(--vscode-contrastBorder, var(--vscode-button-secondaryBackground, #5f6a79))",
              "borderRadius": 20,
              "color": "var(--vscode-button-secondaryForeground, #ffffff)",
              "fontSize": "11px",
              "fontWeight": 400,
              "height": 16,
              "minWidth": "initial",
              "paddingLeft": 13,
              "paddingRight": 13,
              "selectors": Object {
                ".ms-Fabric--isFocusVisible &:focus:after": Object {
                  "inset": -3,
                  "outlineColor": "var(--vscode-focusBorder)",
                },
              },
            }
        `);
    });
});

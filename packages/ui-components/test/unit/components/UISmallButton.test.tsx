import * as React from 'react';
import { render } from '@testing-library/react';
import type { IButtonProps, IButtonStyles } from '@fluentui/react';

// Capture props that UISmallButton passes down to DefaultButton
let capturedProps: IButtonProps | undefined;

const actual = await import('@fluentui/react');
const OriginalDefaultButton = actual.DefaultButton;
const mocked = {
    ...actual,
    DefaultButton: (props: IButtonProps) => {
        capturedProps = props;
        return React.createElement(OriginalDefaultButton as React.ComponentType<IButtonProps>, props);
    }
};
jest.unstable_mockModule('@fluentui/react', () => mocked);

const { UISmallButton } = await import('../../../src/components/UIButton/UISmallButton');

describe('<UISmallButton />', () => {
    beforeEach(() => {
        capturedProps = undefined;
    });

    it('Should render a UISmallButton component', () => {
        const { container } = render(<UISmallButton>Dummy</UISmallButton>);
        expect(container.querySelectorAll('.ms-Button')).toHaveLength(1);
    });

    it('Styles - primary', () => {
        render(<UISmallButton primary={true}>Dummy</UISmallButton>);
        const styles = capturedProps?.styles as IButtonStyles;
        expect(styles?.root).toMatchInlineSnapshot(
            {},
            `
            Object {
              "backgroundColor": "var(--vscode-button-background)",
              "borderColor": "var(--vscode-contrastBorder, var(--vscode-button-background))",
              "borderRadius": "var(--vscode-cornerRadius-circle, 9999px)",
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
        `
        );
    });

    it('Styles - secondary', () => {
        render(<UISmallButton primary={false}>Dummy</UISmallButton>);
        const styles = capturedProps?.styles as IButtonStyles;
        expect(styles?.root).toMatchInlineSnapshot(
            {},
            `
            Object {
              "backgroundColor": "var(--vscode-button-secondaryBackground, #5f6a79)",
              "borderColor": "var(--vscode-contrastBorder, var(--vscode-button-secondaryBackground, #5f6a79))",
              "borderRadius": "var(--vscode-cornerRadius-circle, 9999px)",
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
        `
        );
    });
});

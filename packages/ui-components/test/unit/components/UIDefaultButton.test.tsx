import * as React from 'react';
import * as Enzyme from 'enzyme';
import type { IButtonProps } from '@fluentui/react';
import { DefaultButton } from '@fluentui/react';
import { UIDefaultButton } from '../../../src/components/UIButton/UIDefaultButton';

describe('<UIDefaultButton />', () => {
    let wrapper: Enzyme.ReactWrapper<IButtonProps>;

    beforeEach(() => {
        wrapper = Enzyme.mount(<UIDefaultButton>Dummy</UIDefaultButton>);
    });

    afterEach(() => {
        wrapper.unmount();
    });

    it('Should render a UIDefaultButton component', () => {
        expect(wrapper.find('.ms-Button').length).toEqual(1);
    });

    it('Styles - primary', () => {
        wrapper.setProps({
            primary: true
        });
        const styles = wrapper.find(DefaultButton).props().styles;
        expect(styles?.root).toMatchInlineSnapshot(
            {},
            `
            Object {
              "backgroundColor": "var(--vscode-button-background)",
              "borderColor": "var(--vscode-contrastBorder, var(--vscode-button-background))",
              "borderRadius": 0,
              "color": "var(--vscode-button-foreground)",
              "fontFamily": "var(--vscode-font-family)",
              "fontSize": "13px",
              "fontWeight": 400,
              "height": 22,
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
        wrapper.setProps({
            primary: false
        });
        const styles = wrapper.find(DefaultButton).props().styles;
        expect(styles?.root).toMatchInlineSnapshot(
            {},
            `
            Object {
              "backgroundColor": "var(--vscode-button-secondaryBackground, #5f6a79)",
              "borderColor": "var(--vscode-contrastBorder, var(--vscode-button-secondaryBackground, #5f6a79))",
              "borderRadius": 0,
              "color": "var(--vscode-button-secondaryForeground, #ffffff)",
              "fontFamily": "var(--vscode-font-family)",
              "fontSize": "13px",
              "fontWeight": 400,
              "height": 22,
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

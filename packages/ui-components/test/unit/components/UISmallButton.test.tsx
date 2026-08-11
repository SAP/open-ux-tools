import * as React from 'react';
import Enzyme from 'enzyme';
import { render, fireEvent } from '@testing-library/react';
import type { IButtonProps } from '@fluentui/react';
import { DefaultButton } from '@fluentui/react';
import { UISmallButton } from '../../../src/components/UIButton/UISmallButton';

describe('<UISmallButton />', () => {
    let wrapper: Enzyme.ReactWrapper<IButtonProps>;

    beforeEach(() => {
        wrapper = Enzyme.mount(<UISmallButton>Dummy</UISmallButton>);
    });

    afterEach(() => {
        wrapper.unmount();
    });

    it('Should render a UISmallButton component', () => {
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

    describe('propagateMenuOpenKeyDown', () => {
        it('calls preventDefault on Alt+Down by default', () => {
            let defaultPrevented: boolean | undefined;
            const onKeyDown = jest.fn((ev: React.KeyboardEvent) => {
                defaultPrevented = ev.defaultPrevented;
            });
            const { container } = render(<UISmallButton onKeyDown={onKeyDown}>Test</UISmallButton>);
            fireEvent.keyDown(container.querySelector('.ms-Button')!, { key: 'ArrowDown', altKey: true });
            expect(onKeyDown).toHaveBeenCalledTimes(1);
            expect(defaultPrevented).toBe(true);
        });

        it('does not call preventDefault on Alt+Down when propagateMenuOpenKeyDown is false', () => {
            let defaultPrevented: boolean | undefined;
            const onKeyDown = jest.fn((ev: React.KeyboardEvent) => {
                defaultPrevented = ev.defaultPrevented;
            });
            const { container } = render(
                <UISmallButton propagateMenuOpenKeyDown={false} onKeyDown={onKeyDown}>
                    Test
                </UISmallButton>
            );
            fireEvent.keyDown(container.querySelector('.ms-Button')!, { key: 'ArrowDown', altKey: true });
            expect(onKeyDown).toHaveBeenCalledTimes(1);
            expect(defaultPrevented).toBe(false);
        });
    });
});
